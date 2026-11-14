import CardsPage from "@/components/CardsPage";

// 카드 목록 (메인 화면). 데이터는 CardsPage가 GET /api/cards로 불러온다.
export default function Home() {
  return <CardsPage />;
}
