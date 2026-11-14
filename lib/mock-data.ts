// 프론트 개발용 가짜 데이터. 데모 화면에서는 쓰지 않고, API 오류의 대체 데이터로도 쓰지 않는다.
// 아래 Card 형식은 임시다. 공용 형식(types/)이 정해지면 그쪽으로 맞춘다.

export type CardSource = "kiro" | "claude-code" | "cursor";

export type Card = {
  id: string;
  project_name: string;
  source: CardSource;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string; // 근거가 없으면 "확인 필요"가 들어간다
  created_at: string;
};

export const mockCards: Card[] = [
  {
    id: "1",
    project_name: "demo-repo",
    source: "kiro",
    title: "시간대 때문에 날짜 테스트가 실패한 문제",
    situation: "날짜를 처리하는 함수의 테스트가 실패했다.",
    task: "시간대가 달라도 같은 날짜가 나오게 고쳐야 했다.",
    action: "UTC 기준으로 날짜를 계산하도록 함수를 수정했다.",
    result: "확인 필요",
    created_at: "2026-11-14T11:20:00+09:00",
  },
  {
    id: "2",
    project_name: "demo-repo",
    source: "claude-code",
    title: "API 응답이 비어 있던 문제",
    situation: "카드 목록 API가 빈 배열을 돌려줬다.",
    task: "원인을 찾아 목록이 나오게 해야 했다.",
    action: "쿼리 조건을 확인하고 잘못된 필터를 제거했다.",
    result: "목록이 정상적으로 표시되었다.",
    created_at: "2026-11-14T13:05:00+09:00",
  },
];
