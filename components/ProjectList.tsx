"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 프로젝트(저장소) 목록: GET /api/projects. 실패하면 오류를 그대로 보여 준다.
type Project = { project_name: string; events: number; cards: number; last_at: string };

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

  if (error) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">오류: {error}</p>;
  if (!projects) return <p className="text-zinc-500">불러오는 중...</p>;
  if (projects.length === 0) return <p className="text-zinc-500">아직 수집된 프로젝트가 없습니다.</p>;

  return (
    <ul className="space-y-3">
      {projects.map((p) => (
        <li key={p.project_name}>
          <Link
            href={`/projects/${encodeURIComponent(p.project_name)}`}
            className="block rounded-lg border border-zinc-300 p-4 hover:bg-zinc-50"
          >
            <div className="font-medium">{p.project_name}</div>
            <div className="mt-1 text-sm text-zinc-500">
              기록 {p.events}건 · 트러블 카드 {p.cards}개 · 마지막 활동 {new Date(p.last_at).toLocaleString("ko-KR")}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
