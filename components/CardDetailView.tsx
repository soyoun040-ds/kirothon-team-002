"use client";

import { useEffect, useState } from "react";
import type { CardRow } from "@/lib/services/generate-cards";
import SourceBadge from "./SourceBadge";

// 카드 상세: GET /api/cards/[id]로 불러온다. 실패하면 오류를 그대로 보여 준다.
// 응답에는 카드와 함께 근거 이벤트(evidence)가 들어 있다.
type CardDetail = CardRow & { evidence: unknown[] };

export default function CardDetailView({ id }: { id: string }) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/cards/${encodeURIComponent(id)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `카드 조회 실패 (HTTP ${res.status})`);
        if (!ignore) setCard(json.data as CardDetail);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "카드를 불러오지 못했습니다.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) return <p className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700">오류: {error}</p>;
  if (!card) return <p className="mt-6 text-zinc-500">불러오는 중...</p>;

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
