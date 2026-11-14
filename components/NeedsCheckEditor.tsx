"use client";

import { useState } from "react";
import type { CardRow, StarField } from "@/lib/services/generate-cards";

// "확인 필요" 칸 하나를 고쳐 PATCH /api/cards/[id]로 저장한다.
// 요청 { [field]: 새 내용 }  응답 { data: 수정된 카드 } / 실패 { error }
type Props = {
  cardId: string;
  field: StarField;
  value: string;
  onSaved: (card: CardRow) => void;
};

export default function NeedsCheckEditor({ cardId, field, value, onSaved }: Props) {
  // "확인 필요"만 들어 있으면 빈 칸에서 시작한다.
  const [text, setText] = useState(value.trim() === "확인 필요" ? "" : value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!text.trim()) return setError("내용을 입력해 주세요.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `저장 실패 (HTTP ${res.status})`);
      onSaved(json.data as CardRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dd className="mt-1 space-y-2 rounded border border-red-200 bg-red-50 p-3">
      <p className="text-xs text-red-600">확인 필요: 근거가 없는 칸입니다. 직접 확인한 내용으로 채워 주세요.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded border bg-white p-2 text-sm"
        aria-label={`${field} 수정`}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {error && <span className="text-sm text-red-600">오류: {error}</span>}
      </div>
    </dd>
  );
}
