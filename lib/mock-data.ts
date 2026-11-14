// 프론트 개발용 가짜 데이터. 데모 화면에서는 쓰지 않고, API 오류의 대체 데이터로도 쓰지 않는다.
// 카드 형식은 be-2의 CardRow(lib/services/generate-cards.ts)를 그대로 쓴다.
import type { CardRow } from "@/lib/services/generate-cards";

export const mockCards: CardRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    session_id: "00000000-0000-4000-8000-0000000000a1",
    source: "kiro",
    project_name: "demo-repo",
    title: "시간대 때문에 날짜 테스트가 실패한 문제",
    situation: "날짜를 처리하는 함수의 테스트가 실패했다.",
    task: "시간대가 달라도 같은 날짜가 나오게 고쳐야 했다.",
    action: "UTC 기준으로 날짜를 계산하도록 함수를 수정했다.",
    result: "확인 필요",
    needs_check: ["result"],
    evidence_event_ids: [1, 2],
    created_at: "2026-11-14T11:20:00+09:00",
    updated_at: "2026-11-14T11:20:00+09:00",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    session_id: "00000000-0000-4000-8000-0000000000a2",
    source: "claude-code",
    project_name: "demo-repo",
    title: "API 응답이 비어 있던 문제",
    situation: "카드 목록 API가 빈 배열을 돌려줬다.",
    task: "원인을 찾아 목록이 나오게 해야 했다.",
    action: "쿼리 조건을 확인하고 잘못된 필터를 제거했다.",
    result: "목록이 정상적으로 표시되었다.",
    needs_check: [],
    evidence_event_ids: [3],
    created_at: "2026-11-14T13:05:00+09:00",
    updated_at: "2026-11-14T13:05:00+09:00",
  },
];
