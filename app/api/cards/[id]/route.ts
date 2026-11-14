import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";
import { NEEDS_CHECK, type StarField } from "@/lib/services/generate-cards";

// GET /api/cards/:id   카드 상세 + 근거 이벤트(원본 로그)
// PATCH /api/cards/:id 사용자가 "확인 필요" 칸을 채운다. 본문: { title?, situation?, task?, action?, result? }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE = ["title", "situation", "task", "action", "result"] as const;
const STAR_FIELDS: StarField[] = ["situation", "task", "action", "result"];

export async function GET(_request: Request, ctx: RouteContext<"/api/cards/[id]">) {
  await connection();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "카드 id 형식이 아닙니다." }, { status: 400 });

  const { data: card, error } = await supabase.from("cards").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: `카드 조회 실패: ${error.message}` }, { status: 500 });
  if (!card) return NextResponse.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });

  const ids = (card.evidence_event_ids ?? []) as number[];
  let evidence: unknown[] = [];
  if (ids.length > 0) {
    const res = await supabase
      .from("events")
      .select("*")
      .in("id", ids)
      .order("collected_at", { ascending: true })
      .order("id", { ascending: true });
    if (res.error) return NextResponse.json({ error: `근거 이벤트 조회 실패: ${res.error.message}` }, { status: 500 });
    evidence = res.data ?? [];
  }

  return NextResponse.json({ data: { ...card, evidence } });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "카드 id 형식이 아닙니다." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "본문은 JSON 객체여야 합니다." }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  for (const key of EDITABLE) {
    if (body[key] === undefined) continue;
    const v = body[key];
    if (typeof v !== "string" || !v.trim()) {
      return NextResponse.json({ error: `${key}는 비어 있지 않은 글자여야 합니다.` }, { status: 400 });
    }
    updates[key] = v.trim();
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: `수정할 칸(${EDITABLE.join(", ")})이 없습니다.` }, { status: 400 });
  }

  const { data: card, error } = await supabase.from("cards").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: `카드 조회 실패: ${error.message}` }, { status: 500 });
  if (!card) return NextResponse.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });

  // 수정 후에도 "확인 필요"가 남아 있는 칸만 needs_check에 남긴다.
  const merged = { ...card, ...updates };
  const needsCheck = STAR_FIELDS.filter((f) => String(merged[f]).includes(NEEDS_CHECK));

  const saved = await supabase
    .from("cards")
    .update({ ...updates, needs_check: needsCheck, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (saved.error) return NextResponse.json({ error: `카드 수정 실패: ${saved.error.message}` }, { status: 500 });
  return NextResponse.json({ data: saved.data });
}
