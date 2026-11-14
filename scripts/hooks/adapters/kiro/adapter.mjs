// Kiro hook 어댑터. stdin JSON(NOTES.md 참고)을 공통 이벤트 형식으로 바꿔 send-event.mjs 에 넘긴다.
// 마스킹과 길이 제한은 send-event.mjs 가 한다. 여기서는 변환만 한다.
// 어떤 경우에도 exit 0.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sendEvent } from "../../send-event.mjs";

async function readStdin() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

const SHELL_TOOLS = new Set(["execute_pwsh", "execute_bash"]);
// 파일 수정 도구. 2026-11-14 실제 태스크에서 서브에이전트가 fs_write가 아니라 str_replace로 파일을 고쳤다.
const FILE_TOOLS = new Set(["fs_write", "str_replace", "fs_append"]);

// 에이전트가 `npm test 2>&1 | Select-Object -Last 30`처럼 파이프로 실행하면 종료 코드는 마지막 명령의 것(0)이 된다.
// 그래서 출력에 실패 흔적이 있으면 looks_failed로 따로 표시한다. (exit_code는 받은 그대로 둔다)
const FAILURE_PATTERNS = [
  /\b[1-9]\d*\s+failed\b/i, // vitest/jest: "2 failed"
  /\bFAIL\b/, // jest/vitest 파일 단위 실패
  /\bAssertionError\b/,
  /\bnpm ERR!/,
  /^\s*(×|✖)\s/m, // 실패한 테스트 표시
  /\b(Error|Exception):\s/,
];
function looksFailed(output) {
  return FAILURE_PATTERNS.some((re) => re.test(output));
}

// "Output:\n<출력>\n\nExit Code: N" 을 출력과 종료 코드로 나눈다.
// (Exit Code가 없는 형식이면 exit_code는 null, 출력은 응답 전체)
function parseShellResponse(response) {
  const text = typeof response === "string" ? response : JSON.stringify(response ?? "");
  const m = text.match(/Exit Code:\s*(-?\d+)\s*$/);
  let output = m ? text.slice(0, m.index) : text;
  output = output.replace(/^Output:\r?\n/, "").replace(/\s+$/, "");
  return { exit_code: m ? Number(m[1]) : null, output };
}

// ===== task_complete에 붙이는 spec 내용 =====
// 서버가 파일 경로를 읽지 않도록 어댑터가 읽어서 보낸다. 파일이 없거나 읽을 수 없으면 빈 문자열.
function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

// tasks.md에서 task_name이 들어 있는 체크박스 항목의 하위 줄(설명)을 모은다.
function findTaskDescription(tasksText, taskName) {
  if (!tasksText || !taskName) return "";
  const lines = tasksText.split(/\r?\n/);
  const isItem = (l) => /^\s*-\s*\[.\]\s/.test(l);
  const start = lines.findIndex((l) => isItem(l) && l.includes(taskName));
  if (start < 0) return "";
  const indent = lines[start].match(/^\s*/)[0].length;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    const lead = l.match(/^\s*/)[0].length;
    if (l.trim() && lead <= indent) break; // 같은 단계의 다음 항목에서 끝
    body.push(l.slice(Math.min(lead, indent + 2)));
  }
  return body.join("\n").trim();
}

function readSpec(specPath, taskName) {
  if (!specPath) return { requirements: "", description: "" };
  const dir = dirname(specPath);
  return {
    requirements: readText(join(dir, "requirements.md")).slice(0, 3000),
    description: findTaskDescription(readText(specPath), taskName),
  };
}
// stdin JSON → { type, payload } 또는 null(보내지 않음)
export function convert(input) {
  switch (input.hook_event_name) {
    case "UserPromptSubmit":
      return { type: "prompt", payload: { text: String(input.prompt ?? "") } };

    case "PostToolUse": {
      const tool = input.tool_name;
      const args = input.tool_input ?? {};
      if (SHELL_TOOLS.has(tool)) {
        const { exit_code, output } = parseShellResponse(input.tool_response);
        return {
          type: "shell",
          payload: { command: String(args.command ?? ""), exit_code, looks_failed: exit_code !== 0 || looksFailed(output), output },
        };
      }
      if (tool === "invoke_sub_agent") {
        const report =
          typeof input.tool_response === "string" ? input.tool_response : JSON.stringify(input.tool_response ?? "");
        return { type: "subagent", payload: { request: String(args.prompt ?? ""), report } };
      }
      if (FILE_TOOLS.has(tool)) {
        return { type: "file_change", payload: { path: String(args.path ?? "") } }; // 내용은 저장하지 않는다
      }
      return null; // task_update, read_file 등 나머지는 보내지 않는다
    }

    case "PreTaskExec":
      return { type: "task_start", payload: { spec_path: input.spec_name, task_name: input.task_name } };

    case "PostTaskExec":
      return {
        type: "task_complete",
        payload: {
          spec_path: input.spec_name,
          task_name: input.task_name,
          task_success: input.task_success === true,
          spec: readSpec(input.spec_name, input.task_name),
        },
      };

    case "Stop":
      return { type: "agent_stop", payload: {} };

    default:
      return null;
  }
}

try {
  const raw = await readStdin();
  if (raw.trim()) {
    const input = JSON.parse(raw);
    const converted = convert(input);
    const sessionId = input.session_id || process.env.KIRO_SESSION_ID;
    if (converted && sessionId) {
      await sendEvent({
        source: "kiro",
        session_id: sessionId,
        type: converted.type,
        payload: converted.payload,
        collected_at: new Date().toISOString(), // stdin에는 수집 시각이 없다
      });
    }
  }
} catch {
  // 에이전트 작업을 막지 않는다.
}
process.exit(0);
