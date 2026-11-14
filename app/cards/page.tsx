import CardsPage from "@/components/CardsPage";

// 트러블 카드 전체 목록. 데이터는 CardsPage가 GET /api/cards로 불러온다. (메인 화면은 프로젝트 목록)
export default function Cards() {
  return <CardsPage />;
}
