// 임시 확인용: Kiro hook이 stdin으로 넘겨주는 JSON을 그대로 .trace/dump.jsonl 에 한 줄씩 저장한다.
// 사용: node scripts/hooks/probe/dump-hook.mjs <라벨>
// 확인이 끝나면 .kiro/hooks/trace-dump-*.kiro.hook 을 지우면 된다.
import { mkdirSync, appendFileSync } from "node:fs";

const label = process.argv[2] ?? "unknown";

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let payload;
try {
  payload = raw ? JSON.parse(raw) : null;
} catch {
  payload = { _unparsed: raw.slice(0, 2000) };
}

// 환경변수 전체는 비밀이 섞일 수 있어 KIRO 로 시작하는 것만 남긴다.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.toUpperCase().startsWith("KIRO")),
);

mkdirSync(".trace", { recursive: true });
appendFileSync(
  ".trace/dump.jsonl",
  JSON.stringify({ ts: new Date().toISOString(), label, cwd: process.cwd(), env, stdinBytes: raw.length, payload }) + "\n",
);
