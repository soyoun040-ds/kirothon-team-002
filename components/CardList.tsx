"use client";

import Link from "next/link";
import { useState } from "react";
import type { CardRow } from "@/lib/services/generate-cards";
import SourceBadge from "./SourceBadge";
import ExportModal from "./ExportModal";

export default function CardList({ cards }: { cards: CardRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          disabled={selected.length === 0}
          onClick={() => setOpen(true)}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          내보내기 ({selected.length})
        </button>
      </div>
      <ul className="space-y-3">
        {cards.map((c) => (
          <li key={c.id} className="flex items-start gap-3 rounded-lg border p-4">
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="mt-1"
              aria-label={`${c.title} 선택`}
            />
            <Link href={`/cards/${c.id}`} className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <SourceBadge source={c.source} />
                <span className="text-xs text-zinc-500">{c.project_name}</span>
                <span className="text-xs text-zinc-400">
                  {new Date(c.created_at).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="font-medium">{c.title}</p>
            </Link>
          </li>
        ))}
      </ul>
      {open && (
        <ExportModal
          cards={cards.filter((c) => selected.includes(c.id))}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
