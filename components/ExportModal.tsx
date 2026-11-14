"use client";

import { useState } from "react";
import type { Card } from "@/lib/mock-data";

type Props = { cards: Card[]; onClose: () => void };
type Tab = "readme" | "resume" | "essay";

const tabLabels: Record<Tab, string> = { readme: "README", resume: "이력서", essay: "자소서" };

// 뼈대 단계: 변환 결과는 화면에서 만든 임시 문장이다. 3단계에서 POST /api/export로 바꾼다.
export default function ExportModal({ cards, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("readme");

  const texts: Record<Tab, string> = {
    readme: cards
      .map((c) => `### ${c.title}\n- 상황: ${c.situation}\n- 과제: ${c.task}\n- 행동: ${c.action}\n- 결과: ${c.result}`)
      .join("\n\n"),
    resume: cards.map((c) => `- ${c.title}`).join("\n"),
    essay: "(자소서 문항과 글자 수 입력 칸은 3단계에서 만든다)",
  };
  const text = texts[tab];

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">내보내기 ({cards.length}개 선택)</h2>
          <button onClick={onClose} className="text-sm text-zinc-500">닫기</button>
        </div>
        <div className="mb-3 flex gap-2">
          {(Object.keys(tabLabels) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-sm ${tab === t ? "bg-black text-white" : "bg-zinc-100"}`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm">{text}</pre>
        <button
          onClick={() => navigator.clipboard.writeText(text)}
          className="mt-3 rounded bg-black px-4 py-2 text-sm text-white"
        >
          복사
        </button>
      </div>
    </div>
  );
}
