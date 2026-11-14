import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";

// 데모 카드 백업. seed/ 스크립트가 쓴다.
// GET  /api/demo-cards  모든 카드와 카드가 속한 세션을 내보낸다.
// POST /api/demo-cards  { sessions, cards }를 다시 넣는다. 같은 id가 있으면 덮어쓴다.
// events는 id가 DB에서 자동으로 매겨져 그대로 옮길 수 없어서 백업하지 않는다.
// 그래서 빈 DB에 복원하면 카드 상세의 근거 이벤트는 비어 보인다.

export async function GET() {
  await connection();

  const cards = await supabase.from("cards").select("*").order("created_at", { ascending: true });
  if (cards.error) return NextResponse.json({ error: `카드 조회 실패: ${cards.error.message}` }, { status: 500 });

  const sessionIds = [...new Set((cards.data ?? []).map((c) => c.session_id as string))];
  let sessions: unknown[] = [];
  if (sessionIds.length > 0) {
    const res = await supabase.from("sessions").select("*").in("id", sessionIds);
    if (res.error) return NextResponse.json({ error: `세션 조회 실패: ${res.error.message}` }, { status: 500 });
    sessions = res.data ?? [];
  }

  return NextResponse.json({ data: { sessions, cards: cards.data ?? [] } });
}

function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.every((x) => typeof x === "object" && x !== null && !Array.isArray(x));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON을 읽을 수 없습니다." }, { status: 400 });
  }
  if (!body || !isObjectArray(body.sessions) || !isObjectArray(body.cards)) {
    return NextResponse.json({ error: "본문은 { sessions: [], cards: [] } 형식이어야 합니다." }, { status: 400 });
  }
  if (body.cards.length === 0) return NextResponse.json({ error: "복원할 카드가 없습니다." }, { status: 400 });

  // 복원한 세션은 닫힌 상태로 둔다. 열린 세션으로 넣으면 새 이벤트가 붙을 수 있다.
  const sessions = body.sessions.map((s) => ({ ...s, status: "closed", closed_at: s.closed_at ?? new Date().toISOString() }));
  if (sessions.length > 0) {
    const res = await supabase.from("sessions").upsert(sessions, { onConflict: "id" });
    if (res.error) return NextResponse.json({ error: `세션 복원 실패: ${res.error.message}` }, { status: 500 });
  }

  const res = await supabase.from("cards").upsert(body.cards, { onConflict: "id" }).select("id");
  if (res.error) return NextResponse.json({ error: `카드 복원 실패: ${res.error.message}` }, { status: 500 });

  return NextResponse.json({ data: { sessions: sessions.length, cards: res.data?.length ?? 0 } });
}
