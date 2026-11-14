// 리허설에서 실제 파이프라인으로 만든 카드를 seed/demo-cards.json으로 내보낸다.
// 사용법: npm run dev 를 켠 상태에서  node seed/export-demo-cards.mjs
// 다른 서버를 쓰려면: CVAGENT_URL=https://... node seed/export-demo-cards.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.env.CVAGENT_URL ?? "http://localhost:3000";
const out = fileURLToPath(new URL("./demo-cards.json", import.meta.url));

const res = await fetch(`${base}/api/demo-cards`);
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`내보내기 실패 (${res.status}): ${json.error ?? "알 수 없는 오류"}`);
  process.exit(1);
}

writeFileSync(out, JSON.stringify(json.data, null, 2) + "\n", "utf8");
console.log(`카드 ${json.data.cards.length}개, 세션 ${json.data.sessions.length}개를 ${out}에 저장했습니다.`);
