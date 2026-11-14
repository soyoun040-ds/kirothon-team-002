import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import SourceBadge from "@/components/SourceBadge";
import { mockCards } from "@/lib/mock-data";

// Cache Components 규칙: params는 <Suspense> 안에서 읽어야 빌드가 통과한다.
export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-zinc-500">← 목록으로</Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">불러오는 중...</p>}>
        <CardDetail params={params} />
      </Suspense>
    </main>
  );
}

// 뼈대 단계: mock-data 사용. 2단계에서 GET /api/cards/[id]로 바꾼다.
async function CardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = mockCards.find((c) => c.id === id);
  if (!card) notFound();

  const rows: [string, string][] = [
    ["상황", card.situation],
    ["과제", card.task],
    ["행동", card.action],
    ["결과", card.result],
  ];

  return (
    <>
      <div className="mt-3 mb-4 flex items-center gap-2">
        <SourceBadge source={card.source} />
        <span className="text-xs text-zinc-500">{card.project_name}</span>
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{card.title}</h1>
      <dl className="space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-medium text-zinc-500">{label}</dt>
            <dd className={value.includes("확인 필요") ? "text-red-600" : ""}>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
