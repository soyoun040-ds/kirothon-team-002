// 개발용 테스트 카드 만들기. 손으로 카드를 넣지 않고, 실제 파이프라인을 그대로 탄다.
//   이벤트 저장(POST /api/events) → 세션 닫기 → LLM 카드 생성 → GET /api/cards로 확인
//
// 사용법: npm run dev 를 켠 상태에서
//   node seed/send-test-events.mjs            spec 태스크 완료(task_complete)로 자동 닫기
//   node seed/send-test-events.mjs --manual   "지금 정리하기"(POST /api/sessions/close)로 닫기
// 다른 서버: CVAGENT_URL=https://... node seed/send-test-events.mjs
//
// 개발 확인용이다. 데모 화면용 카드는 리허설에서 실제 Kiro 작업으로 만든다(product.md).

const base = process.env.CVAGENT_URL ?? "http://localhost:3000";
const manual = process.argv.includes("--manual");
const project = "cvagent-test";
const sessionId = `test-${Date.now()}`;
const t0 = Date.now();
const at = (sec) => new Date(t0 + sec * 1000).toISOString();

const failOutput = ` FAIL  src/date.test.ts > formatDate > 자정 근처 날짜를 한국 시간으로 표시한다
AssertionError: expected '2026-11-13' to be '2026-11-14'
 ❯ src/date.test.ts:12:41
     10|   it("자정 근처 날짜를 한국 시간으로 표시한다", () => {
     11|     const d = new Date("2026-11-13T15:30:00Z");
     12|     expect(formatDate(d)).toBe("2026-11-14");
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)`;

const events = [
  { type: "task_start", payload: { spec_path: ".kiro/specs/todo/tasks.md", task_name: "2. 마감일 표시" } },
  { type: "shell", payload: { command: "npx vitest run", exit_code: 1, output: failOutput } },
  { type: "file_change", payload: { path: "src/date.ts" } },
  {
    type: "subagent",
    payload: {
      request: "formatDate가 UTC 기준으로 날짜를 자르는 문제를 고쳐 줘",
      report: "toISOString().slice(0,10)이 UTC 날짜를 돌려줘서 한국 시간 자정~09시 사이 날짜가 하루 밀렸습니다. Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })로 바꿨습니다.",
    },
  },
  { type: "shell", payload: { command: "npx vitest run", exit_code: 0, output: " Test Files  1 passed (1)\n      Tests  4 passed (4)" } },
];
if (!manual) {
  events.push({
    type: "task_complete",
    payload: {
      task_name: "2. 마감일 표시",
      task_success: true,
      spec_path: ".kiro/specs/todo/tasks.md",
      spec: {
        requirements: "WHEN 할 일에 마감일이 있으면 THE SYSTEM SHALL 한국 시간 기준 날짜(YYYY-MM-DD)로 표시한다.",
        description: "- formatDate(date)를 구현한다\n- src/date.test.ts가 통과해야 한다",
      },
    },
  });
}

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} 실패 (${res.status}): ${json.error ?? "알 수 없는 오류"}`);
  return json.data;
}

async function cardCount() {
  const cards = await call("GET", `/api/cards?project_name=${encodeURIComponent(project)}`);
  return cards.length;
}

try {
  const before = await cardCount(); // cards 테이블이 없으면 여기서 오류가 난다.

  for (const [i, e] of events.entries()) {
    await call("POST", "/api/events", { source: "kiro", project_name: project, session_id: sessionId, collected_at: at(i * 30), ...e });
  }
  console.log(`이벤트 ${events.length}개 저장 (세션 ${sessionId})`);

  if (manual) {
    const result = await call("POST", "/api/sessions/close", { project_name: project });
    console.log(`세션 닫기: ${result.status}, 카드 ${result.cards?.length ?? 0}개`);
    process.exit(0);
  }

  // task_complete는 응답 뒤에 카드를 만든다. 최대 120초 기다린다.
  console.log("카드 생성을 기다리는 중... (LLM 호출, 수십 초 걸릴 수 있음)");
  for (let s = 0; s < 120; s += 5) {
    await new Promise((r) => setTimeout(r, 5000));
    const now = await cardCount();
    if (now > before) {
      console.log(`카드 ${now - before}개 생성됨. http://localhost:3000 에서 확인하세요.`);
      process.exit(0);
    }
  }
  console.log("120초 안에 카드가 생기지 않았습니다. npm run dev 터미널의 오류(세션 닫기 실패 등)를 확인하세요.");
  process.exit(1);
} catch (e) {
  console.error(e.message);
  if (String(e.message).includes("cards")) console.error("→ Supabase SQL Editor에서 db/be-2/cards.sql을 실행했는지 확인하세요.");
  process.exit(1);
}
