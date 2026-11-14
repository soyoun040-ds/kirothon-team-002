// 출처 배지. source는 DB에서 오는 글자라서 모르는 값이면 회색으로 보여 준다.
const colors: Record<string, string> = {
  kiro: "bg-purple-100 text-purple-700",
  "claude-code": "bg-orange-100 text-orange-700",
  cursor: "bg-blue-100 text-blue-700",
  git: "bg-zinc-200 text-zinc-700",
};

export default function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[source] ?? "bg-zinc-100 text-zinc-600"}`}>
      {source}
    </span>
  );
}
