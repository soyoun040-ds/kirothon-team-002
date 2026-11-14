import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { NEEDS_CHECK, callLlm, type CardRow } from "@/lib/services/generate-cards";

// POST /api/export: 선택한 카드를 README 트러블슈팅 섹션 / 이력서 한 줄 / 자소서 초안으로 바꾼다.
// 본문: { card_ids: string[], question?: string, char_limit?: number }
// - README, 이력서: 카드 내용을 그대로 틀에 넣는다(LLM 없음).
// - 자소서: question이 있을 때만 LLM으로 만든다. 실패해도 README와 이력서는 돌려준다.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CARDS = 10;

function firstSentence(text: string): string {
  const s = text.split(/(?<=[.!?。])\s|\n/)[0]?.trim() ?? text;
  return s.replace(/[.。]$/, "");
}

function toReadme(cards: CardRow[]): string {
  const parts = cards.map(
    (c, i) => `### ${i + 1}. ${c.title}

- **상황**: ${c.situation}
- **과제**: ${c.task}
- **해결**: ${c.action}
- **결과**: ${c.result}`,
  );
  return `## 트러블슈팅\n\n${parts.join("\n\n")}\n`;
}

function toResumeLine(c: CardRow): string {
  const action = firstSentence(c.action);
  if (c.result.includes(NEEDS_CHECK)) return `${c.title}: ${action}`;
  return `${c.title}: ${action}, ${firstSentence(c.result)}`;
}

function coverLetterPrompt(cards: CardRow[], question: string, charLimit: number): string {
  const body = cards
    .map(
      (c, i) => `경험 ${i + 1}: ${c.title}
상황: ${c.situation}
과제: ${c.task}
행동: ${c.action}
결과: ${c.result}`,
    )
    .join("\n\n");
  return `너는 대학생의 자기소개서 초안을 돕는다. 아래 경험만 근거로 문항에 답하는 초안을 쓴다.

규칙:
- 경험에 없는 사실, 수치, 결과를 지어내지 않는다. "${NEEDS_CHECK}"인 내용은 쓰지 않는다.
- 상황 → 과제 → 행동 → 결과 흐름으로 쓴다.
- 공백 포함 ${charLimit}자 이내, 한국어, 문장으로만 쓴다(제목, 목록, 마크다운 없이).
- 초안 본문만 출력한다.

문항: ${question}

경험:
${body}`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "본문은 JSON 객체여야 합니다." }, { status: 400 });
  }

  const ids = body.card_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "card_ids에 카드를 하나 이상 넣어 주세요." }, { status: 400 });
  }
  if (ids.length > MAX_CARDS) {
    return NextResponse.json({ error: `카드는 최대 ${MAX_CARDS}개까지 고를 수 있습니다.` }, { status: 400 });
  }
  if (!ids.every((id) => typeof id === "string" && UUID.test(id))) {
    return NextResponse.json({ error: "card_ids에 올바르지 않은 id가 있습니다." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const charLimit = body.char_limit === undefined ? 500 : Number(body.char_limit);
  if (!Number.isInteger(charLimit) || charLimit < 100 || charLimit > 3000) {
    return NextResponse.json({ error: "char_limit은 100~3000 사이 정수여야 합니다." }, { status: 400 });
  }

  const { data, error } = await supabase.from("cards").select("*").in("id", ids);
  if (error) return NextResponse.json({ error: `카드 조회 실패: ${error.message}` }, { status: 500 });
  // 사용자가 고른 순서를 지킨다.
  const cards = ids
    .map((id) => (data as CardRow[]).find((c) => c.id === id))
    .filter((c): c is CardRow => c !== undefined);
  if (cards.length === 0) return NextResponse.json({ error: "고른 카드를 찾을 수 없습니다." }, { status: 404 });

  let coverLetter: string | null = null;
  let coverLetterError: string | null = null;
  if (question) {
    try {
      coverLetter = (await callLlm(coverLetterPrompt(cards, question, charLimit))).trim();
    } catch (e) {
      coverLetterError = e instanceof Error ? e.message : "자소서 생성 실패";
    }
  }

  return NextResponse.json({
    data: {
      readme: toReadme(cards),
      resume: cards.map(toResumeLine),
      cover_letter: coverLetter,
      cover_letter_length: coverLetter?.length ?? null,
      cover_letter_error: coverLetterError,
      // "확인 필요"가 남은 카드. 화면에서 먼저 채우라고 안내할 수 있다.
      needs_check_card_ids: cards.filter((c) => c.needs_check.length > 0).map((c) => c.id),
    },
  });
}
