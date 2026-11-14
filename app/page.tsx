import CardList from "@/components/CardList";
import { mockCards } from "@/lib/mock-data";

// 뼈대 단계: mock-data 사용. 2단계에서 GET /api/cards로 바꾼다.
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">트러블슈팅 카드</h1>
      <CardList cards={mockCards} />
    </main>
  );
}
