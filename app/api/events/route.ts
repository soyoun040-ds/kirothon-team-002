import { after, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { closeSession } from "@/lib/services/close-session";
import type { EventSource, EventType } from "@/types/event";

// POST /api/events: 모든 도구의 공통 입구. 검증하고 저장만 한다.

const SOURCES: EventSource[] = ["kiro", "claude-code", "cursor", "git"];
const TYPES: EventType[] = [
  "prompt",
  "shell",
  "task_start",
  "task_complete",
  "agent_stop",
  "subagent",
  "file_change",
  "commit",
  "session_end",
];

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// 열린 세션을 찾는다. 없으면 null.
async function findOpenSession(source: string, project: string, externalId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("source", source)
    .eq("project_name", project)
    .eq("external_id", externalId)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id as string | undefined;
}

// 열린 세션을 찾고, 없으면 만든다. 동시에 만들다 unique 위반(23505)이 나면 다시 조회한다.
async function getOrCreateSession(source: string, project: string, externalId: string) {
  const found = await findOpenSession(source, project, externalId);
  if (found) return found;

  const { data, error } = await supabase
    .from("sessions")
    .insert({ source, project_name: project, external_id: externalId })
    .select("id")
    .single();
  if (!error) return data.id as string;

  if (error.code === "23505") {
    const again = await findOpenSession(source, project, externalId);
    if (again) return again;
  }
  throw new Error(error.message);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return bad("본문은 JSON 객체여야 합니다.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return bad("JSON을 읽을 수 없습니다.");
  }

  const { source, project_name, session_id, type, payload, collected_at } = body;

  if (!SOURCES.includes(source as EventSource)) {
    return bad(`source는 ${SOURCES.join(", ")} 중 하나여야 합니다.`);
  }
  if (!isNonEmptyString(project_name)) return bad("project_name이 필요합니다.");
  if (!isNonEmptyString(session_id)) return bad("session_id가 필요합니다.");
  if (!TYPES.includes(type as EventType)) {
    return bad(`type은 ${TYPES.join(", ")} 중 하나여야 합니다.`);
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return bad("payload는 JSON 객체여야 합니다.");
  }

  // collected_at이 없으면 서버 시각. 있으면 올바른 날짜여야 한다.
  let collectedAt: string;
  if (collected_at === undefined || collected_at === null) {
    collectedAt = new Date().toISOString();
  } else if (typeof collected_at === "string" && !Number.isNaN(Date.parse(collected_at))) {
    collectedAt = new Date(collected_at).toISOString();
  } else {
    return bad("collected_at은 ISO 8601 날짜 문자열이어야 합니다.");
  }

  try {
    // 응답 종료(agent_stop)는 내용이 없는 구분용 이벤트다. 태스크 완료로 세션이 막 닫힌 직후에 오면
    // 빈 세션이 새로 열려 "지금 정리하기"가 그 빈 세션을 닫게 되므로, 열린 세션이 없을 때는 저장하지 않는다.
    if (type === "agent_stop") {
      const open = await findOpenSession(source as string, project_name.trim(), session_id.trim());
      if (!open) {
        return NextResponse.json({ data: { skipped: true, reason: "열린 세션이 없어 저장하지 않음" } });
      }
    }

    const sessionId = await getOrCreateSession(
      source as string,
      project_name.trim(),
      session_id.trim(),
    );

    const { data, error } = await supabase
      .from("events")
      .insert({
        session_id: sessionId,
        source,
        project_name: project_name.trim(),
        type,
        payload,
        collected_at: collectedAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // spec 태스크 완료면 응답을 보낸 뒤에 세션을 닫는다. 실패해도 저장 응답(201)은 그대로.
    if (type === "task_complete") {
      after(() =>
        closeSession(sessionId, "task_done").catch((e) => console.error("세션 닫기 실패:", e)),
      );
    }

    return NextResponse.json(
      { data: { id: data.id, session_id: sessionId, collected_at: collectedAt } },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `저장 실패: ${message}` }, { status: 500 });
  }
}
