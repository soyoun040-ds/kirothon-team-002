import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 서버와 Supabase 연결 확인용. 브라우저에서 /api/health 를 열어 본다.
export async function GET() {
  const { error } = await supabase.auth.getSession();
  if (error) {
    return NextResponse.json({ error: `Supabase 연결 실패: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ data: { ok: true } });
}
