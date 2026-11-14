"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 내 프로젝트(저장소·과제) 목록: GET /api/projects. 폴더 모양 카드를 가로 격자로 보여 준다.
type Project = { project_name: string; events: number; cards: number; last_at: string };

// 폴더 색은 이름으로 정해서 새로고침해도 같은 색이 나오게 한다.
const COLORS = [
  { tab: "bg-amber-300", body: "bg-amber-200", text: "text-amber-900" },
  { tab: "bg-sky-300", body: "bg-sky-200", text: "text-sky-900" },
  { tab: "bg-violet-300", body: "bg-violet-200", text: "text-violet-900" },
  { tab: "bg-emerald-300", body: "bg-emerald-200", text: "text-emerald-900" },
  { tab: "bg-rose-300", body: "bg-rose-200", text: "text-rose-900" },
];
function colorOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

function Folder({ p }: { p: Project }) {
  const c = colorOf(p.project_name);
  return (
    <Link href={`/projects/${encodeURIComponent(p.project_name)}`} className="group block">
      {/* 폴더 탭 */}
      <div className={`ml-3 h-4 w-16 rounded-t-md ${c.tab} transition group-hover:-translate-y-0.5`} />
      {/* 폴더 몸통 */}
      <div
        className={`flex aspect-[4/3] flex-col justify-between rounded-xl rounded-tl-none ${c.body} p-4 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md`}
      >
        <div className={`line-clamp-2 break-all text-lg font-semibold ${c.text}`}>{p.project_name}</div>
        <div className={`space-y-0.5 text-xs ${c.text} opacity-80`}>
          <div>트러블 카드 {p.cards}개 · 기록 {p.events}건</div>
          <div>{new Date(p.last_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 마지막 작업</div>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `프로젝트 조회 실패 (HTTP ${res.status})`);
        if (!ignore) setProjects(json.data as Project[]);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "프로젝트를 불러오지 못했습니다.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">오류: {error}</p>;
  if (!projects) return <p className="text-zinc-400">불러오는 중...</p>;
  if (projects.length === 0)
    return <p className="text-zinc-400">아직 수집된 프로젝트가 없습니다. 저장소에서 install.sh를 실행해 보세요.</p>;

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
      {projects.map((p) => (
        <Folder key={p.project_name} p={p} />
      ))}
    </div>
  );
}
