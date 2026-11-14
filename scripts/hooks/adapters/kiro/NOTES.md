# Kiro hook 실험 메모 (be-1)

2026-11-14에 Kiro 1.4.178(Windows)에서 직접 확인한 사실이다. **추측으로 바꾸지 말 것.** 확인되지 않은 것은 맨 아래에 따로 적었다.

## hook 파일

- 위치: `.kiro/hooks/*.json`. 형식:
  ```json
  { "version": "v1", "hooks": [
    { "name": "이름", "trigger": "UserPromptSubmit", "matcher": "(선택, 정규식)",
      "action": { "type": "command", "command": "node scripts/hooks/adapters/kiro/adapter.mjs prompt" },
      "timeout": 10 }
  ] }
  ```
- trigger: `UserPromptSubmit`, `PostToolUse`, `PreTaskExec`, `PostTaskExec`, `Stop`
- `matcher`는 `PostToolUse`에서 **도구 이름**에 대한 정규식. 없으면 모든 도구 호출마다 실행된다.
- 옛 `.kiro.hook` 형식은 인식되지 않는다.
- 명령은 워크스페이스 폴더에서 실행되고, **stdin으로 JSON**을 받는다. 환경변수 `KIRO_SESSION_ID`도 있다.
- hook은 세션 시작 시 로드된다. 파일을 고친 뒤에는 창 다시 로드 + 새 채팅. 워크스페이스가 Trust 상태여야 실행된다. 폴더는 안쪽 프로젝트 폴더를 직접 열어야 한다.

## stdin JSON 형식

공통: `session_id`, `hook_event_name`, `cwd`. 수집 시각은 **없으므로** 스크립트가 붙인다.

| trigger | 추가 필드 |
|---|---|
| `UserPromptSubmit` | `prompt` |
| `PostToolUse` | `tool_name`, `tool_input`, `tool_response` |
| `PreTaskExec` | `spec_name`(**tasks.md 전체 경로**), `task_name` |
| `PostTaskExec` | `spec_name`, `task_name`, `task_success`(boolean) |
| `Stop` | 없음(답변 텍스트 없음) |

## 도구별 PostToolUse (실제로 찍힌 것)

| tool_name | tool_input | tool_response | 저장 |
|---|---|---|---|
| `execute_pwsh` (Windows 셸) | `command`, `description` | 문자열 `Output:\n<출력>\n\nExit Code: N` | 명령, 종료 코드(`Exit Code: (\d+)`), 출력 끝부분 |
| `invoke_sub_agent` | `name`, `prompt`, `specTask` | 서브에이전트 보고문(문자열) | 요청과 보고문 |
| `fs_write` | `path`, `text` | `Created the ... file.` | **경로만** (내용 저장 금지) |
| `task_update` | `taskId`, `status`, `error` | JSON 문자열 | 상태와 error |
| `read_file`, `list_directory`, `task_get`, `task_list` | | | **저장하지 않음** (읽기, 크기 큼) |

- 서브에이전트 안의 도구 호출도 같은 `session_id`로 잡힌다. 구분 필드는 없다.
- spec 태스크를 Start task로 실행하면 `UserPromptSubmit`은 발생하지 않는다.
- 순서 예: `task_get` → `PreTaskExec` → `task_update(in_progress)` → 도구 호출들 → `invoke_sub_agent` → `PostTaskExec` → `task_update(completed)` → `Stop`
- 이미 완료(`[x]`)된 태스크는 다시 실행되지 않는다.

## 어댑터가 할 일

- stdin JSON을 읽어 **공통 이벤트 형식**(`source: "kiro"`, `project_name`, `session_id`, `type`, `payload`, 수집 시각)으로 바꾸고, 공통 전송 스크립트 `scripts/hooks/send-event.mjs`에 넘긴다.
- 위 표의 "저장하지 않음" 도구는 걸러 낸다. `PostToolUse`는 matcher로 먼저 줄인다.
- 길이 제한 초기값(조정 가능): 셸 출력은 끝 40줄 또는 4,000자, 프롬프트 2,000자, 서브에이전트 보고문 3,000자.
- 어떤 경우에도 **정상 종료(exit 0)**, 서버가 꺼져 있어도 무시, 전송 제한 시간 5초 이하. 에이전트 작업을 막지 않는다.
- 마스킹은 `send-event.mjs`에서만 한다.

## 아직 확인하지 못한 것

- 셸 명령이 **실패했을 때**의 `tool_response` 형식 (종료 코드가 0이 아닐 때)
- Mac의 셸 도구 이름 (`execute_bash`로 추정)
- `str_replace` 등 `fs_write` 외 파일 수정 도구의 이름
- 태스크가 실패했을 때 `task_success: false`와 `task_update.error`의 내용
- claude-code, cursor hook의 입력 형식 (구현 전에 `scripts/hooks/probe/`로 직접 찍어서 확인)
