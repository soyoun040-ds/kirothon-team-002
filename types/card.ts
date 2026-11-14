// 공통 카드 형식. cards 테이블(db/be-2/cards.sql) 한 행과 같다.
// 변경 시 전원 합의 필요.

// STAR 칸 이름. "확인 필요" 표시(needs_check)도 이 이름을 쓴다.
export type StarField = "situation" | "task" | "action" | "result";

// cards 테이블 한 행
export type CardRow = {
  id: string; // uuid
  session_id: string; // sessions.id (uuid)
  source: string; // 출처 배지: kiro | claude-code | cursor | git
  project_name: string;
  title: string;
  situation: string; // S: 상황
  task: string; // T: 과제
  action: string; // A: 행동
  result: string; // R: 결과. 근거가 없으면 "확인 필요"
  needs_check: StarField[]; // "확인 필요"가 남은 칸
  evidence_event_ids: number[]; // 근거가 된 events.id
  created_at: string;
  updated_at: string;
};
