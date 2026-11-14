// seed/demo-cards.json을 DB에 다시 넣는다. 같은 id가 있으면 덮어쓴다.
// 사용법: npm run dev 를 켠 상태에서  node seed/restore-demo-cards.mjs
// 다른 서버를 쓰려면: CVAGENT_URL=https://... node seed/restore-demo-cards.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.env.CVAGENT_URL ?? "http://localhost:3000";
const file = fileURLToPath(new URL("./demo-cards.json", import.meta.url));

let backup;
try {
  backup = JSON.parse(readFileSync(file, "utf8"));
} catch {
  console.error(`${file}을 읽을 수 없습니다. 먼저 node seed/export-demo-cards.mjs 를 실행하세요.`);
  process.exit(1);
}

const res = await fetch(`${base}/api/demo-cards`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(backup),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`복원 실패 (${res.status}): ${json.error ?? "알 수 없는 오류"}`);
  process.exit(1);
}
console.log(`카드 ${json.data.cards}개, 세션 ${json.data.sessions}개를 복원했습니다.`);
