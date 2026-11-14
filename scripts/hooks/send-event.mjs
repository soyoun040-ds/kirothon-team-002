// 공통 전송 스크립트. 모든 어댑터와 git post-commit은 이 파일을 통해서만 서버로 보낸다.
// 하는 일: 길이 제한 + 비밀 키 마스킹 + POST /api/events (제한 시간 5초).
// 어떤 경우에도 에이전트 작업을 막지 않는다. 실패는 모두 무시하고 exit 0.
//
// 사용 1) 어댑터에서: import { sendEvent } from "../../send-event.mjs"
// 사용 2) 명령줄: echo '<이벤트 JSON>' | node scripts/hooks/send-event.mjs
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const TIMEOUT_MS = 5000;
const DEFAULT_SERVER = "http://localhost:3000";

// ===== 길이 제한 =====
const LIMITS = {
  shellOutputLines: 40,
  shellOutputChars: 4000,
  promptChars: 2000,
  subagentRequestChars: 2000,
  subagentReportChars: 3000,
  commandChars: 2000,
  specChars: 3000,
};

function head(text, max) {
  return text.length > max ? text.slice(0, max) + "\n...(잘림)" : text;
}

// 끝부분을 남긴다. 줄 수와 글자 수 둘 다 제한한다.
function tail(text, maxLines, maxChars) {
  const lines = text.split(/\r?\n/);
  let cut = false;
  let out = lines;
  if (lines.length > maxLines) {
    out = lines.slice(-maxLines);
    cut = true;
  }
  let joined = out.join("\n");
  if (joined.length > maxChars) {
    joined = joined.slice(-maxChars);
    cut = true;
  }
  return cut ? "(앞부분 잘림)...\n" + joined : joined;
}

// ===== 마스킹 =====
const MASK = "***";
const SECRET_RULES = [
  // KEY=값, SECRET=값, TOKEN=값, PASSWORD=값 (이름에 포함되면 모두). 값은 따옴표 문자열 또는 공백 전까지.
  [/(\b[\w.-]*(?:KEY|SECRET|TOKEN|PASSWORD)[\w.-]*\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s"',;]+)/gi, `$1${MASK}`],
  // .env 파일 내용: 줄 시작의 NAME=값 (대문자 환경변수 형식)
  [/^(\s*(?:export\s+)?[A-Z][A-Z0-9_]{2,}\s*=\s*).+$/gm, `$1${MASK}`],
  [/sk-[A-Za-z0-9_-]{16,}/g, MASK],
  [/eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)*/g, MASK],
  [/sb_publishable_[A-Za-z0-9_-]+/g, MASK],
  [/sb_secret_[A-Za-z0-9_-]+/g, MASK],
  [/AKIA[0-9A-Z]{16}/g, MASK],
  // 사용자 홈 폴더 경로의 사용자 이름 (실명 노출 방지). 이름 부분만 "~"로 바꾼다.
  // C:\Users\이름\ 와 JSON 이스케이프된 C:\\Users\\이름\\ 둘 다 처리한다.
  [/([A-Za-z]:\\{1,2}Users\\{1,2})[^\\/:*?"<>|\r\n]+(?=\\)/gi, "$1~"],
  // /Users/이름/ (macOS), /home/이름/ (Linux)
  [/(\/(?:Users|home)\/)[^/\\\s"']+(?=\/)/g, "$1~"],
];

export function maskText(text) {
  let out = text;
  for (const [re, rep] of SECRET_RULES) out = out.replace(re, rep);
  return out;
}

// payload 안의 모든 문자열을 재귀적으로 마스킹한다.
function maskDeep(value) {
  if (typeof value === "string") return maskText(value);
  if (Array.isArray(value)) return value.map(maskDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskDeep(v)]));
  }
  return value;
}

// 마스킹을 먼저 하고 그 다음에 자른다. (자르다가 키가 반쯤 남는 일을 막는다)
function limitPayload(type, payload) {
  const p = { ...payload };
  const str = (v) => (typeof v === "string" ? v : null);
  if (type === "prompt" && str(p.text) !== null) p.text = head(p.text, LIMITS.promptChars);
  if (type === "shell") {
    if (str(p.output) !== null) p.output = tail(p.output, LIMITS.shellOutputLines, LIMITS.shellOutputChars);
    if (str(p.command) !== null) p.command = head(p.command, LIMITS.commandChars);
  }
  if (type === "task_complete" && p.spec && typeof p.spec === "object") {
    p.spec = {
      requirements: head(String(p.spec.requirements ?? ""), LIMITS.specChars),
      description: head(String(p.spec.description ?? ""), LIMITS.specChars),
    };
  }
  if (type === "subagent") {
    if (str(p.request) !== null) p.request = head(p.request, LIMITS.subagentRequestChars);
    if (str(p.report) !== null) p.report = head(p.report, LIMITS.subagentReportChars);
  }
  return p;
}

// ===== 설정 (.cvagent/config.json) =====
function readConfig(cwd) {
  const file = join(cwd, ".cvagent", "config.json");
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) ?? {};
  } catch {
    // 설정이 깨져 있어도 기본값으로 진행한다.
  }
  return {};
}

// ===== 전송 =====
// event: { source, session_id, type, payload, collected_at?, project_name? }
// 반환: 성공 여부(true/false). 예외는 던지지 않는다.
export async function sendEvent(event, cwd = process.cwd()) {
  try {
    const config = readConfig(cwd);
    // 설정의 주소가 http(s)로 시작하지 않으면(예: 설치 때 방향키 입력이 섞인 경우) 기본값을 쓴다.
    const configured = String(config.server_url || "").trim();
    const server = (/^https?:\/\/\S+$/.test(configured) ? configured : DEFAULT_SERVER).replace(/\/+$/, "");
    const payload = maskDeep(event.payload ?? {});
    const body = {
      source: event.source,
      project_name: event.project_name || config.project_name || basename(cwd),
      session_id: event.session_id,
      type: event.type,
      payload: limitPayload(event.type, payload),
      collected_at: event.collected_at || new Date().toISOString(),
    };
    const res = await fetch(`${server}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false; // 서버가 꺼져 있거나 시간이 초과돼도 무시한다.
  }
}

// ===== 명령줄 실행: stdin의 이벤트 JSON을 보낸다 =====
async function readStdin() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const raw = await readStdin();
    if (raw.trim()) await sendEvent(JSON.parse(raw));
  } catch {
    // 무시
  }
  process.exit(0);
}
