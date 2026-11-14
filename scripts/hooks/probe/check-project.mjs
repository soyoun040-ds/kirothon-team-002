// 수집 결과 확인용: 한 프로젝트의 이벤트, 세션, 카드를 요약해서 보여 준다. (읽기 전용)
// 사용: 이 저장소 폴더에서  node scripts/hooks/probe/check-project.mjs <project_name>
//       project_name을 빼면 프로젝트별 이벤트 수만 보여 준다.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const get = async (path) => {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  return res.json();
};

const project = process.argv[2];
if (!project) {
  const rows = await get("events?select=project_name");
  const count = {};
  for (const r of rows) count[r.project_name] = (count[r.project_name] ?? 0) + 1;
  console.log("프로젝트별 이벤트 수:", count);
} else {
  await showProject(project);
}

async function showProject(project) {
const P = `project_name=eq.${encodeURIComponent(project)}`;
const events = await get(`events?select=id,type,payload,collected_at&${P}&order=collected_at,id`);
console.log(`[이벤트] ${events.length}건`);
for (const e of events) {
  const p = e.payload ?? {};
  const spec = p.spec ?? {};
  const detail =
    {
      prompt: String(p.text ?? "").slice(0, 60),
      shell: `exit=${p.exit_code} looks_failed=${p.looks_failed} ${String(p.command ?? "").slice(0, 50)}`,
      file_change: String(p.path ?? "").slice(-40),
      subagent: `보고문 ${String(p.report ?? "").length}자`,
      task_start: String(p.task_name ?? "").slice(0, 40),
      task_complete: `success=${p.task_success} 요구사항 ${String(spec.requirements ?? "").length}자 설명 ${String(spec.description ?? "").length}자`,
    }[e.type] ?? "";
  console.log(`  ${e.id} ${e.collected_at.slice(11, 19)} ${e.type} ${detail}`);
}

const sessions = await get(`sessions?select=status,reason,created_at&${P}&order=created_at`);
console.log(`[세션] ${sessions.length}개`);
for (const s of sessions) console.log(`  ${s.created_at.slice(11, 19)} ${s.status} ${s.reason ?? ""}`);

const cards = await get(`cards?select=title,situation,task,action,result,needs_check,evidence_event_ids&${P}`);
console.log(`[카드] ${cards.length}개`);
for (const c of cards) {
  console.log(`  - ${c.title}`);
  console.log(`    확인 필요: ${JSON.stringify(c.needs_check)}  근거 이벤트: ${JSON.stringify(c.evidence_event_ids)}`);
}
}
