import { NextResponse, after } from "next/server";
import {
  closeLatestOpenSession,
  closeSession,
  findOpenSessionId,
  type CloseReason,
} from "@/lib/services/close-session";

// POST /api/sessions/close: 세션을 닫고 카드를 만든다. 로직은 lib/services/close-session.ts에 있다.
//
// 본문(셋 중 하나):
//   {}                                        가장 최근 열린 세션 ("지금 정리하기" 버튼). project_name을 주면 그 프로젝트만
//   { session_id }                            sessions.id(uuid)로 지정
//   { source, project_name, external_id }     도구가 준 세션 ID로 지정 (태스크 완료, 세션 종료 hook)
// reason: task_done | manual | idle | session_end (기본 manual)
//
// task_done, session_end는 hook이 기다리지 않도록 바로 202로 답하고, 카드 생성은 응답 뒤에 실행한다.

const REASONS: CloseReason[] = ["task_done", "manual", "idle", "session_end"];
const BACKGROUND: CloseReason[] = ["task_done", "session_end"];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "알 수 없는 오류";
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "본문은 JSON 객체여야 합니다." }, { status: 400 });
  }

  const reason = (str(body.reason) ?? "manual") as CloseReason;
  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: `reason은 ${REASONS.join(", ")} 중 하나여야 합니다.` }, { status: 400 });
  }

  const sessionId = str(body.session_id);
  const source = str(body.source);
  const projectName = str(body.project_name);
  const externalId = str(body.external_id);

  try {
    // 닫을 세션 id를 정한다.
    let targetId: string | null = sessionId ?? null;
    if (!targetId && externalId) {
      if (!source || !projectName) {
        return NextResponse.json({ error: "external_id를 쓰려면 source와 project_name도 필요합니다." }, { status: 400 });
      }
      targetId = await findOpenSessionId(source, projectName, externalId);
      if (!targetId) return NextResponse.json({ error: "열린 세션이 없습니다." }, { status: 404 });
    }

    // 백그라운드 처리 (hook용)
    if (targetId && BACKGROUND.includes(reason)) {
      const id = targetId;
      after(async () => {
        try {
          await closeSession(id, reason);
        } catch (e) {
          console.error(`세션 ${id} 닫기 실패: ${errorMessage(e)}`);
        }
      });
      return NextResponse.json({ data: { status: "accepted", session_id: id } }, { status: 202 });
    }

    // 바로 처리 (버튼용): 결과(카드)를 함께 돌려준다.
    const result = targetId ? await closeSession(targetId, reason) : await closeLatestOpenSession(projectName);
    if (!result) return NextResponse.json({ error: "열린 세션이 없습니다." }, { status: 404 });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: `세션 닫기 실패: ${errorMessage(e)}` }, { status: 500 });
  }
}
