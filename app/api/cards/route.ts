import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/cards: 카드 목록 (최신순). ?project_name= 으로 프로젝트를 고를 수 있다.
export async function GET(request: Request) {
  await connection(); // 빌드 때 미리 만들지 않고 요청마다 DB를 읽는다.

  const projectName = new URL(request.url).searchParams.get("project_name")?.trim();
  let query = supabase.from("cards").select("*").order("created_at", { ascending: false });
  if (projectName) query = query.eq("project_name", projectName);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: `카드 목록 조회 실패: ${error.message}` }, { status: 500 });
  return NextResponse.json({ data });
}
