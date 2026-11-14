"use client";

import { useCallback, useEffect, useState } from "react";
import type { CardRow } from "@/lib/services/generate-cards";

// 내보내기: POST /api/export
// 요청 { card_ids, question?, char_limit? }  응답 { data: ExportResult } / 실패 { error }
// README·이력서는 열자마자 만든다(LLM 없음, 빠름). 자소서는 문항을 넣고 버튼을 누를 때만 만든다(LLM, 느림).
type ExportResult = {
  readme: string;
  resume: string[];
  cover_letter: string | null;
  cover_letter_length: number | null;
  cover_letter_error: string | null;
  needs_check_card_ids: string[];
};

type Props = { cards: CardRow[]; onClose: () => void };
type Tab = "readme" | "resume" | "essay";

const tabLabels: Record<Tab, string> = { readme: "README", resume: "이력서", essay: "자소서" };

async function requestExport(body: object): Promise<ExportResult> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `내보내기 실패 (HTTP ${res.status})`);
  return json.data as ExportResult;
}

export default function ExportModal({ cards, onClose }: Props) {
  const cardIds = cards.map((c) => c.id);
  const [tab, setTab] = useState<Tab>("readme");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [charLimit, setCharLimit] = useState("500");
  const [essayLoading, setEssayLoading] = useState(false);
  const [essayError, setEssayError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const idsKey = cardIds.join(",");
  const loadBasic = useCallback(async () => {
    setError(null);
    try {
      setResult(await requestExport({ card_ids: idsKey.split(",") }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기에 실패했습니다.");
    }
  }, [idsKey]);

  useEffect(() => {
    loadBasic();
  }, [loadBasic]);

  async function makeEssay() {
    const limit = Number(charLimit);
    if (!question.trim()) return setEssayError("자소서 문항을 입력해 주세요.");
    if (!Number.isInteger(limit) || limit < 100 || limit > 3000) {
      return setEssayError("글자 수는 100~3000 사이 정수로 입력해 주세요.");
    }
    setEssayLoading(true);
    setEssayError(null);
    try {
      const data = await requestExport({ card_ids: cardIds, question: question.trim(), char_limit: limit });
      setResult(data);
      if (data.cover_letter_error) setEssayError(data.cover_letter_error);
    } catch (e) {
      setEssayError(e instanceof Error ? e.message : "자소서 생성에 실패했습니다.");
    } finally {
      setEssayLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("복사했습니다.");
    } catch {
      setCopied("복사하지 못했습니다. 글을 직접 선택해 복사해 주세요.");
    }
  }

  const texts: Record<Tab, string | null> = {
    readme: result?.readme ?? null,
    resume: result ? result.resume.map((line) => `- ${line}`).join("\n") : null,
    essay: result?.cover_letter ?? null,
  };
  const text = texts[tab];
  const needsCheckCount = result?.needs_check_card_ids.length ?? 0;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">내보내기 ({cards.length}개 선택)</h2>
          <button onClick={onClose} className="text-sm text-zinc-500">닫기</button>
        </div>

        <div className="mb-3 flex gap-2">
          {(Object.keys(tabLabels) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setCopied(null); }}
              className={`rounded px-3 py-1 text-sm ${tab === t ? "bg-black text-white" : "bg-zinc-100"}`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">오류: {error}</p>}
        {!error && !result && <p className="text-sm text-zinc-500">만드는 중...</p>}
        {needsCheckCount > 0 && (
          <p className="mb-3 text-sm text-amber-700">
            &quot;확인 필요&quot; 칸이 남은 카드가 {needsCheckCount}개 있습니다. 상세 화면에서 먼저 채우면 결과가 더 정확해집니다.
          </p>
        )}

        {tab === "essay" && result && (
          <div className="mb-3 space-y-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="자소서 문항 (예: 어려운 문제를 해결한 경험을 쓰시오)"
              className="w-full rounded border p-2 text-sm"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={charLimit}
                onChange={(e) => setCharLimit(e.target.value)}
                min={100}
                max={3000}
                className="w-24 rounded border p-2 text-sm"
                aria-label="글자 수"
              />
              <span className="text-sm text-zinc-500">자 이내</span>
              <button
                onClick={makeEssay}
                disabled={essayLoading}
                className="ml-auto rounded border border-black px-3 py-1 text-sm disabled:opacity-40"
              >
                {essayLoading ? "만드는 중... (최대 1~2분)" : "자소서 초안 만들기"}
              </button>
            </div>
            {essayError && <p className="text-sm text-red-600">오류: {essayError}</p>}
          </div>
        )}

        {text && (
          <>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm">{text}</pre>
            {tab === "essay" && result?.cover_letter_length != null && (
              <p className="mt-1 text-xs text-zinc-500">공백 포함 {result.cover_letter_length}자</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button onClick={() => copy(text)} className="rounded bg-black px-4 py-2 text-sm text-white">
                복사
              </button>
              {copied && <span className="text-sm text-zinc-600">{copied}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
