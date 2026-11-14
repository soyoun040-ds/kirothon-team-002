import type { CardSource } from "@/lib/mock-data";

const colors: Record<CardSource, string> = {
  kiro: "bg-purple-100 text-purple-700",
  "claude-code": "bg-orange-100 text-orange-700",
  cursor: "bg-blue-100 text-blue-700",
};

export default function SourceBadge({ source }: { source: CardSource }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[source]}`}>
      {source}
    </span>
  );
}
