"use client";

import { useCallback, useEffect, useState } from "react";
import type { CardRow } from "@/lib/services/generate-cards";
import type { CloseResult } from "@/lib/services/close-session";
import CardList from "./CardList";

// 메인 화면: GET /api/cards로 목록을 불러오고, "지금 정리하기"로 POST /api/sessions/close를 호출한다.
// API가 실패하면 대체 데이터 없이 오류를 그대로 보여 준다.
export default function CardsPage() {
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/cards", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `카드 목록 조회 실패 (HTTP ${res.status})`);
      setCards(json.data as CardRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "카드 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  async function closeNow() {
    setClosing(true);
    setCloseMessage(null);
    try {
      const res = await fetch("/api/sessions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `세션 닫기 실패 (HTTP ${res.status})`);

      const result = json.data as CloseResult;
      setCloseMessage(
        result.status === "closed"
          ? `정리 완료: 새 카드 ${result.cards.length}개`
          : `건너뜀: ${result.message}`,
      );
      await loadCards();
    } catch (e) {
      setCloseMessage(`오류: ${e instanceof Error ? e.message : "세션을 닫지 못했습니다."}`);
    } finally {
      setClosing(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">트러블슈팅 카드</h1>
        <a href="/projects" className="ml-auto mr-3 text-sm text-violet-700 underline-offset-2 hover:underline">
          프로젝트 보고서 →
        </a>
        <button
          onClick={closeNow}
          disabled={closing}
          className="rounded border border-black px-4 py-2 text-sm disabled:opacity-40"
        >
          {closing ? "정리 중... (최대 1~2분)" : "지금 정리하기"}
        </button>
      </div>

      {closeMessage && (
        <p className={`mb-4 text-sm ${closeMessage.startsWith("오류") ? "text-red-600" : "text-zinc-600"}`}>
          {closeMessage}
        </p>
      )}

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">오류: {error}</p>}
      {!error && cards === null && <p className="text-zinc-500">불러오는 중...</p>}
      {!error && cards?.length === 0 && <p className="text-zinc-500">아직 카드가 없습니다.</p>}
      {!error && cards && cards.length > 0 && <CardList cards={cards} />}
    </main>
  );
}
