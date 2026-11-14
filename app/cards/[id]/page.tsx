import Link from "next/link";
import { Suspense } from "react";
import CardDetailView from "@/components/CardDetailView";

// Cache Components 규칙: params는 <Suspense> 안에서 읽어야 빌드가 통과한다.
export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/cards" className="text-sm text-zinc-500">← 카드 목록으로</Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">불러오는 중...</p>}>
        <CardDetail params={params} />
      </Suspense>
    </main>
  );
}

// 주소의 id를 읽어 상세 화면(GET /api/cards/[id] 호출)에 넘긴다.
async function CardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetailView id={id} />;
}
