import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";
import { callLlm } from "@/lib/services/generate-cards";
import type { CardRow } from "@/types/card";

// 프로젝트 전체 보고서.
// GET  /api/projects/:name/report  수집된 기록으로 4단 보고서 재료를 만든다. (LLM 없음, 기록 그대로)
//   1. 이 프로젝트는 무엇인가  2. 내가 한 일  3. 겪은 어려움(카드)  4. 어떻게 해결했나(카드)
// POST /api/projects/:name/report  같은 재료로 포트폴리오용 문단을 LLM이 쓴다. (근거 없는 내용 금지)

type EventRow = { id: number; type: string; payload: Record<string, unknown>; collected_at: string };

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}

// "c:\dev\demo-schedule\src\a.ts" → "src/a.ts" (프로젝트 폴더 아래 경로로 줄인다)
function shortPath(path: string, project: string) {
  const p = path.replace(/\\+/g, "/");
  const i = p.toLowerCase().lastIndexOf(`/${project.toLowerCase()}/`);
  return i >= 0 ? p.slice(i + project.length + 2) : p.split("/").slice(-2).join("/");
}

async function buildReport(project: string) {
  const [ev, cd] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, payload, collected_at")
      .eq("project_name", project)
      .order("collected_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("cards").select("*").eq("project_name", project).order("created_at", { ascending: true }),
  ]);
  if (ev.error) throw new Error(`이벤트 조회 실패: ${ev.error.message}`);
  if (cd.error) throw new Error(`카드 조회 실패: ${cd.error.message}`);
  const all = (ev.data ?? []) as EventRow[];
  const cards = (cd.data ?? []) as CardRow[];

  // 1. 프로젝트 설명: 가장 최근 project_info(README, product.md, package.json 설명). 작업 기록에서는 뺀다.
  const info = all.filter((e) => e.type === "project_info").at(-1)?.payload ?? {};
  const events = all.filter((e) => e.type !== "project_info");
  const description = {
    product: str(info.product),
    readme: str(info.readme),
    package_name: str(info.package_name),
    package_description: str(info.package_description),
  };

  // 이번 작업의 spec 요구사항: 가장 최근 태스크 완료 이벤트에 실린 것
  let requirements = "";
  for (const e of events) {
    const spec = (e.payload.spec ?? {}) as Record<string, unknown>;
    if (e.type === "task_complete" && str(spec.requirements)) requirements = str(spec.requirements);
  }

  // 2. 내가 한 일: 완료한 태스크, 내가 내린 지시, 수정한 파일
  const tasks = new Map<string, { name: string; success: boolean; at: string }>();
  const prompts: { text: string; at: string }[] = [];
  const files = new Set<string>();
  let shells = 0;
  let failedShells = 0;
  for (const e of events) {
    const p = e.payload;
    if (e.type === "task_complete" && str(p.task_name)) {
      tasks.set(str(p.task_name), { name: str(p.task_name), success: p.task_success === true, at: e.collected_at });
    } else if (e.type === "prompt") {
      const text = str(p.text).trim().replace(/^["“”']+|["“”']+$/g, "");
      if (text.length >= 6 && !prompts.some((x) => x.text === text)) prompts.push({ text: text.slice(0, 200), at: e.collected_at });
    } else if (e.type === "file_change" && str(p.path)) {
      files.add(shortPath(str(p.path), project));
    } else if (e.type === "shell") {
      shells += 1;
      if (p.looks_failed === true || (typeof p.exit_code === "number" && p.exit_code !== 0)) failedShells += 1;
    }
  }

  return {
    project_name: project,
    period: { start: events[0]?.collected_at ?? null, end: events.at(-1)?.collected_at ?? null },
    counts: { events: events.length, prompts: prompts.length, shells, failed_shells: failedShells, files: files.size, cards: cards.length },
    overview: { description, requirements: requirements.slice(0, 1500) },
    my_work: { tasks: [...tasks.values()], prompts: prompts.slice(-15), files: [...files].sort() },
    troubles: cards.map((c) => ({ id: c.id, title: c.title, situation: c.situation, task: c.task })),
    solutions: cards.map((c) => ({ id: c.id, title: c.title, action: c.action, result: c.result, needs_check: c.needs_check })),
  };
}

export async function GET(_request: Request, ctx: RouteContext<"/api/projects/[name]/report">) {
  await connection();
  const { name } = await ctx.params;
  const project = decodeURIComponent(name);
  try {
    const report = await buildReport(project);
    if (report.counts.events === 0 && !Object.values(report.overview.description).some(Boolean)) {
      return NextResponse.json({ error: `'${project}' 프로젝트의 기록이 없습니다.` }, { status: 404 });
    }
    return NextResponse.json({ data: report });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "보고서 생성 실패" }, { status: 500 });
  }
}

function summaryPrompt(report: Awaited<ReturnType<typeof buildReport>>) {
  return `너는 대학생의 개발 포트폴리오를 정리하는 도우미다. 아래 "기록"만 근거로, 한 프로젝트 전체를 설명하는 포트폴리오 문단 4개를 한국어로 써라.

규칙:
- 기록에 없는 사실, 특히 수치·성과·사용자 반응은 지어내지 않는다. 모르면 쓰지 않는다.
- "나는"을 주어로, 내가 한 일로 쓴다. AI 도구, 에이전트, 서브에이전트, hook을 언급하지 않는다.
- 각 문단은 2~4문장. 마크다운, 목록, 제목 없이 문장으로만 쓴다.
- 반드시 아래 JSON 하나만 출력한다. 다른 말은 쓰지 않는다.
{"overview":"이 프로젝트가 무엇인지","my_work":"내가 맡아 한 일","difficulties":"겪은 어려움(여러 개면 묶어서)","solutions":"어떻게 해결했고 무엇이 확인됐는지"}

기록:
${JSON.stringify(
  {
    project: report.project_name,
    project_description: {
      product: report.overview.description.product.slice(0, 2000),
      readme: report.overview.description.readme.slice(0, 2000),
      package_description: report.overview.description.package_description,
    },
    requirements: report.overview.requirements,
    completed_tasks: report.my_work.tasks,
    my_instructions: report.my_work.prompts.map((p) => p.text),
    changed_files: report.my_work.files,
    shell_runs: { total: report.counts.shells, failed: report.counts.failed_shells },
    troubles: report.troubles,
    solutions: report.solutions,
  },
  null,
  1,
)}`;
}

export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[name]/report">) {
  await connection();
  const { name } = await ctx.params;
  const project = decodeURIComponent(name);
  try {
    const report = await buildReport(project);
    if (report.counts.events === 0 && !Object.values(report.overview.description).some(Boolean)) {
      return NextResponse.json({ error: `'${project}' 프로젝트의 기록이 없습니다.` }, { status: 404 });
    }
    const text = await callLlm(summaryPrompt(report));
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const summary = {
      overview: str(parsed.overview),
      my_work: str(parsed.my_work),
      difficulties: str(parsed.difficulties),
      solutions: str(parsed.solutions),
    };
    return NextResponse.json({ data: summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI 문장 생성 실패" }, { status: 500 });
  }
}
