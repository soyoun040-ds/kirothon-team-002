// 공통 이벤트 형식. 모든 도구(어댑터)와 git post-commit이 이 형식으로 POST /api/events 에 보낸다.
// 변경 시 전원 합의 필요.

// "git"은 post-commit 전용. 어느 AI 도구에서 왔는지 모르기 때문에 별도 출처로 둔다.
export type EventSource = "kiro" | "claude-code" | "cursor" | "git";

export type EventType =
  | "prompt" // 사용자 프롬프트 입력
  | "shell" // 셸 실행 결과 (에러 포함)
  | "task_start" // spec 태스크 시작 (PreTaskExec)
  | "task_complete" // spec 태스크 완료 (kiro의 세션 종료 신호)
  | "agent_stop" // 에이전트 응답 종료 (응답 구분용, 세션 종료 아님)
  | "subagent" // invoke_sub_agent의 요청과 보고문
  | "file_change" // 파일 변경 (경로만)
  | "commit" // git 커밋 (메시지 + diff)
  | "session_end"; // claude-code / cursor의 세션 종료 hook

export type CvEvent = {
  source: EventSource;
  project_name: string;
  session_id: string; // 도구가 준 세션 ID. 없으면 .cvagent/의 세션 ID
  type: EventType;
  payload: Record<string, unknown>; // 타입별 내용 (아래 참고)
  collected_at: string; // ISO 8601. 수집 시각. 정렬 기준(같으면 id 순). 요청에서 빠지면 서버 시각으로 채운다
};

// payload 예시 (서버는 객체인지만 검증한다)
// prompt:        { text }
// shell:         { command, exit_code, output }
// task_start:    { spec_path, task_name }
// task_complete: { task_id, task_title, task_success, spec_path, spec: { requirements, description } }  (task_success: boolean, 성공/실패 구분)
// subagent:      { request, report }
// file_change:   { path }
// agent_stop:    { summary? }
// commit:        { hash, message, diff }
// session_end:   { reason? }

export type SessionStatus = "open" | "closing" | "closed";

// sessions 테이블 한 행
export type SessionRow = {
  id: string; // uuid
  source: EventSource;
  project_name: string;
  external_id: string; // 이벤트의 session_id
  status: SessionStatus;
  last_processed_event_id: number | null;
  reason: string | null; // 닫은 이유: task_done | manual | idle | session_end
  created_at: string;
  closed_at: string | null;
};

// events 테이블 한 행
export type EventRow = {
  id: number;
  session_id: string; // sessions.id (uuid)
  source: EventSource;
  project_name: string;
  type: EventType;
  payload: Record<string, unknown>;
  collected_at: string;
  created_at: string;
};
