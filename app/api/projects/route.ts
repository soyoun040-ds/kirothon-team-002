import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/projects : 수집된 프로젝트(저장소) 목록. 이벤트 수, 카드 수, 마지막 활동 시각.
export async function GET() {
  await connection();
  const [ev, cd] = await Promise.all([
    supabase.from("events").select("project_name, collected_at"),
    supabase.from("cards").select("project_name"),
  ]);
  if (ev.error) return NextResponse.json({ error: `이벤트 조회 실패: ${ev.error.message}` }, { status: 500 });
  if (cd.error) return NextResponse.json({ error: `카드 조회 실패: ${cd.error.message}` }, { status: 500 });

  const map = new Map<string, { project_name: string; events: number; cards: number; last_at: string }>();
  for (const e of ev.data ?? []) {
    const p = map.get(e.project_name) ?? { project_name: e.project_name, events: 0, cards: 0, last_at: "" };
    p.events += 1;
    if (e.collected_at > p.last_at) p.last_at = e.collected_at;
    map.set(e.project_name, p);
  }
  for (const c of cd.data ?? []) {
    const p = map.get(c.project_name);
    if (p) p.cards += 1;
  }
  const data = [...map.values()].sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
  return NextResponse.json({ data });
}
