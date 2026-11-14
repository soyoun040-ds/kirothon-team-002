import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { supabase } from "@/lib/supabase";
import type { EventRow, SessionRow } from "@/types/event";

// 카드 생성: 세션의 이벤트(프롬프트, 셸 결과, spec, diff)를 한 번에 LLM에 보내
// 트러블슈팅을 STAR 카드로 만든다(세션당 0~3개). 수집 경로와 무관하게 다른 입구(MCP 등)에서도 쓴다.

// TODO: 팀 합의 후 types/card.ts로 옮긴다.
export type StarField = "situation" | "task" | "action" | "result";

export type CardRow = {
  id: string;
  session_id: string;
  source: string;
  project_name: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  needs_check: StarField[];
  evidence_event_ids: number[];
  created_at: string;
  updated_at: string;
};

export const NEEDS_CHECK = "확인 필요";
const MAX_CARDS = 3;
const MAX_TEXT = 2000; // 이벤트 하나에서 보내는 최대 글자 수
const MAX_PROMPT = 60000; // LLM에 보내는 전체 최대 글자 수
const STAR_FIELDS: StarField[] = ["situation", "task", "action", "result"];

function cut(value: unknown, max = MAX_TEXT): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text.length > max ? `${text.slice(0, max)}…(생략)` : text;
}

// 이벤트 하나를 LLM이 읽기 쉬운 한 덩어리 글로 바꾼다. 카드 근거와 무관한 이벤트는 null.
function describeEvent(e: EventRow): string | null {
  const p = e.payload;
  const head = `[#${e.id} ${e.type} ${e.collected_at}]`;
  switch (e.type) {
    case "prompt":
      return `${head} 사용자 프롬프트:\n${cut(p.text)}`;
    case "shell":
      return `${head} 셸 명령: ${cut(p.command, 300)} (exit_code: ${p.exit_code ?? "?"})\n${cut(p.output)}`;
    case "task_start":
      return `${head} spec 태스크 시작: ${cut(p.task_name, 300)}`;
    case "task_complete":
      return `${head} spec 태스크 완료: ${cut(p.task_name, 300)} (성공: ${p.task_success ?? "?"})\nspec: ${cut(p.spec)}`;
    case "subagent":
      return `${head} 서브에이전트 요청:\n${cut(p.request)}\n보고:\n${cut(p.report)}`;
    case "file_change":
      return `${head} 파일 변경: ${cut(p.path, 300)}`;
    case "commit":
      return `${head} 커밋: ${cut(p.message, 500)}\ndiff:\n${cut(p.diff, 6000)}`;
    case "agent_stop":
      return p.summary ? `${head} 에이전트 응답 요약: ${cut(p.summary)}` : null;
    default:
      return null;
  }
}

function buildPrompt(events: EventRow[]): string {
  const lines = events.map(describeEvent).filter((v): v is string => v !== null);
  let log = lines.join("\n\n");
  if (log.length > MAX_PROMPT) log = `…(앞부분 생략)\n${log.slice(-MAX_PROMPT)}`;

  return `너는 대학생 개발자의 작업 로그에서 포트폴리오용 트러블슈팅을 찾는 도우미다.
아래 로그에서 "문제 발생 → 원인 파악 → 해결"이 드러난 트러블슈팅을 최대 ${MAX_CARDS}개 찾아 STAR 카드로 만든다.

규칙:
- 로그에 근거가 있는 내용만 쓴다. 지어내지 않는다.
- 근거가 없는 칸, 특히 수치와 결과는 정확히 "${NEEDS_CHECK}"라고만 쓰고 needs_check에 그 칸 이름을 넣는다.
- 오타, import 누락, 단순 설정 변경 같은 사소한 수정은 카드로 만들지 않는다.
- 트러블슈팅이 없으면 cards를 빈 배열로 둔다.
- evidence_event_ids에는 근거가 된 로그 번호(#뒤 숫자)를 넣는다.
- 한국어로 쓴다.

JSON만 출력한다. 형식:
{"cards":[{"title":"","situation":"","task":"","action":"","result":"","needs_check":["result"],"evidence_event_ids":[1,2]}]}

로그:
${log}`;
}

// LLM 호출: Kiro CLI를 실행해 stdout 전체를 돌려준다. 내보내기(자소서 초안)에서도 같은 함수를 쓴다.
// - 프롬프트는 stdin으로 넘긴다(Windows 명령줄 길이 제한).
// - cwd는 프로젝트 밖(임시 폴더). 프로젝트의 Kiro hook이 돌지 않게 한다.
// - 모델: KIRO_MODEL (기본 claude-sonnet-5.5), 실행 파일: KIRO_CLI_PATH (기본 kiro-cli)
const LLM_TIMEOUT_MS = 90_000;

export function callLlm(prompt: string): Promise<string> {
  const bin = process.env.KIRO_CLI_PATH || "kiro-cli";
  const model = process.env.KIRO_MODEL || "claude-sonnet-5.5";
  const args = ["chat", "--no-interactive", "--trust-tools=", "--model", model];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd: tmpdir(), windowsHide: true });
    let stdout = "";
    let stderr = "";
    let done = false;

    const finish = (err: Error | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(stdout);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`Kiro CLI가 ${LLM_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다.`));
    }, LLM_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));

    // 실행 파일을 찾지 못한 경우 등
    child.on("error", (e) => finish(new Error(`Kiro CLI 실행 실패(${bin}): ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) finish(null);
      else finish(new Error(`Kiro CLI 종료 코드 ${code}: ${stderr.trim().slice(-500) || "(stderr 없음)"}`));
    });

    // stdin이 먼저 닫혀도(EPIPE) 서버가 죽지 않게 한다. 결과는 close에서 판단한다.
    child.stdin.on("error", () => {});
    child.stdin.end(prompt, "utf8");
  });
}

type CardDraft = Pick<CardRow, "title" | StarField | "needs_check" | "evidence_event_ids">;

// LLM 응답을 검사해 쓸 수 있는 카드만 남긴다.
function parseCards(text: string, validIds: Set<number>): CardDraft[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("LLM 응답에서 JSON을 찾지 못했습니다.");
  const parsed = JSON.parse(text.slice(start, end + 1)) as { cards?: unknown };
  if (!Array.isArray(parsed.cards)) throw new Error("LLM 응답에 cards 배열이 없습니다.");

  const drafts: CardDraft[] = [];
  for (const raw of parsed.cards.slice(0, MAX_CARDS)) {
    if (typeof raw !== "object" || raw === null) continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.title !== "string" || !c.title.trim()) continue;

    const fields = {} as Record<StarField, string>;
    const needsCheck = new Set<StarField>();
    for (const f of STAR_FIELDS) {
      const v = typeof c[f] === "string" ? (c[f] as string).trim() : "";
      fields[f] = v || NEEDS_CHECK;
      if (fields[f].includes(NEEDS_CHECK)) needsCheck.add(f);
    }
    if (Array.isArray(c.needs_check)) {
      for (const f of c.needs_check) if (STAR_FIELDS.includes(f as StarField)) needsCheck.add(f as StarField);
    }

    // 실제 이 세션 이벤트만 근거로 인정한다. 근거가 하나도 없으면 카드를 버린다(거짓 이력 방지).
    const evidence = Array.isArray(c.evidence_event_ids)
      ? c.evidence_event_ids.map(Number).filter((id) => validIds.has(id))
      : [];
    if (evidence.length === 0) continue;

    drafts.push({ title: c.title.trim(), ...fields, needs_check: [...needsCheck], evidence_event_ids: evidence });
  }
  return drafts;
}

// 세션과 이벤트를 받아 카드를 만들고 저장한다. 저장된 카드를 돌려준다.
export async function generateCards(session: SessionRow, events: EventRow[]): Promise<CardRow[]> {
  if (events.length === 0) return [];

  const text = await callLlm(buildPrompt(events));
  const drafts = parseCards(text, new Set(events.map((e) => e.id)));
  if (drafts.length === 0) return [];

  const { data, error } = await supabase
    .from("cards")
    .insert(
      drafts.map((d) => ({
        ...d,
        session_id: session.id,
        source: session.source,
        project_name: session.project_name,
      })),
    )
    .select("*");
  if (error) throw new Error(`카드 저장 실패: ${error.message}`);
  return data as CardRow[];
}
