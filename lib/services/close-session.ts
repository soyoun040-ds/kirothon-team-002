import { supabase } from "@/lib/supabase";
import type { EventRow, SessionRow } from "@/types/event";
import type { CardRow } from "@/types/card";
import { generateCards } from "@/lib/services/generate-cards";

// 세션 닫기: 열린 세션을 닫고 카드 생성을 실행한다.
// 호출하는 곳: spec 태스크 완료, "지금 정리하기" 버튼, 세션 종료 hook, (나중에) MCP.

export type CloseReason = "task_done" | "manual" | "idle" | "session_end";

export type CloseResult =
  | { status: "closed"; session_id: string; cards: CardRow[] }
  | { status: "skipped"; session_id: string; message: string };

// 1단계: open → closing으로 바꾼다. 조건부 update라서 동시에 여러 번 호출돼도 한 번만 성공한다.
async function claimSession(sessionId: string, reason: CloseReason): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "closing", reason })
    .eq("id", sessionId)
    .eq("status", "open")
    .select("*");
  if (error) throw new Error(`세션 상태 변경 실패: ${error.message}`);
  return (data?.[0] as SessionRow | undefined) ?? null;
}

// 마지막으로 처리한 이벤트 이후의 이벤트만 시간순으로 가져온다(중복 방지).
async function loadNewEvents(session: SessionRow): Promise<EventRow[]> {
  let query = supabase
    .from("events")
    .select("*")
    .eq("session_id", session.id)
    .order("collected_at", { ascending: true })
    .order("id", { ascending: true });
  if (session.last_processed_event_id !== null) {
    query = query.gt("id", session.last_processed_event_id);
  }
  const { data, error } = await query;
  if (error) throw new Error(`이벤트 조회 실패: ${error.message}`);
  return (data ?? []) as EventRow[];
}

// 실패하면 다시 open으로 돌려 재시도할 수 있게 한다.
// 그 사이 같은 ID로 새 열린 세션이 생겼으면(unique 위반) closing으로 남겨 둔다.
async function releaseSession(sessionId: string) {
  const { error } = await supabase
    .from("sessions")
    .update({ status: "open", reason: null })
    .eq("id", sessionId)
    .eq("status", "closing");
  if (error) console.error(`세션 ${sessionId} 되돌리기 실패: ${error.message}`);
}

export async function closeSession(sessionId: string, reason: CloseReason): Promise<CloseResult> {
  const session = await claimSession(sessionId, reason);
  if (!session) {
    return { status: "skipped", session_id: sessionId, message: "이미 닫혔거나 처리 중인 세션입니다." };
  }

  try {
    const events = await loadNewEvents(session);
    const cards = await generateCards(session, events);

    const lastId = events.length > 0 ? Math.max(...events.map((e) => e.id)) : session.last_processed_event_id;
    const { error } = await supabase
      .from("sessions")
      .update({ status: "closed", closed_at: new Date().toISOString(), last_processed_event_id: lastId })
      .eq("id", session.id);
    if (error) throw new Error(`세션 닫기 실패: ${error.message}`);

    return { status: "closed", session_id: session.id, cards };
  } catch (e) {
    await releaseSession(session.id);
    throw e;
  }
}

// 도구가 준 세션 ID(external_id)로 열린 세션을 찾는다. 태스크 완료, 세션 종료 hook용.
export async function findOpenSessionId(
  source: string,
  projectName: string,
  externalId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("source", source)
    .eq("project_name", projectName)
    .eq("external_id", externalId)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw new Error(`열린 세션 조회 실패: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

// "지금 정리하기" 버튼용: 가장 최근에 열린 세션을 닫는다. projectName을 주면 그 프로젝트에서만 찾는다.
export async function closeLatestOpenSession(projectName?: string): Promise<CloseResult | null> {
  let query = supabase
    .from("sessions")
    .select("id")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);
  if (projectName) query = query.eq("project_name", projectName);

  const { data, error } = await query;
  if (error) throw new Error(`열린 세션 조회 실패: ${error.message}`);
  if (!data || data.length === 0) return null;
  return closeSession(data[0].id as string, "manual");
}
