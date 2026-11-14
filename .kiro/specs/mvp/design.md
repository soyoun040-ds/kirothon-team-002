# Design – MVP

> 이 문서는 **기술 설계**(구조, 화면 목록, API, 데이터)다. 색상·레이아웃 같은 화면 디자인은 포함하지 않는다.
> 이미 구현된 부분은 코드가 기준이다: `types/event.ts`, `db/be-1/events.sql`, `app/api/events/route.ts`, `scripts/hooks/`.
> **[제안]** 표시는 아직 합의되지 않은 부분이다. be-2, fe, PM이 확정하고 이 문서를 고친다. 형식을 바꾸려면 전원 합의가 필요하다.

## 전체 구조

```
[대상 저장소: Kiro hook]
  UserPromptSubmit / PostToolUse / PreTaskExec / PostTaskExec / Stop
        │  stdin JSON
        ▼
  scripts/hooks/adapters/kiro/adapter.mjs   (공통 이벤트 형식으로 변환)
        ▼
  scripts/hooks/send-event.mjs              (마스킹, 길이 제한, 수집 시각, 항상 exit 0)
        │  POST /api/events
        ▼
  app/api/events/route.ts                   (검증하고 저장만 한다)  → sessions, events
        │  type이 task_complete이면
        ▼
  lib/services/close-session.ts             closeSession(sessionId, 'task_done')
        │  open → closing 조건부 갱신(중복 방지)
        ▼
  lib/services/generate-cards.ts            LLM 호출 → cards
        ▼
  GET /api/cards, /api/cards/[id]  →  화면(목록, 상세)  →  POST /api/export
```

- "지금 정리하기" 버튼은 `POST /api/sessions/close`로 같은 `closeSession(sessionId, 'manual')`을 호출한다.
- route는 서비스 함수를 호출하는 얇은 층이다. 세션 닫기와 카드 생성 로직은 `lib/services/` 두 함수에만 둔다.

## 화면

(경로와 파일은 `structure.md` 기준. 구성은 fe가 정한다.)

| 화면 | 경로 | 하는 일 | 부르는 API |
|---|---|---|---|
| 카드 목록 | `/` (`app/page.tsx`) | 카드를 시간순으로 보여 준다. 출처 배지, "지금 정리하기" 버튼 | `GET /api/cards`, `POST /api/sessions/close` |
| 카드 상세 | `/cards/[id]` | 카드 항목과 근거 이벤트를 보여 주고, "확인 필요" 칸을 사용자가 채운다 | `GET /api/cards/[id]`, `PATCH /api/cards/[id]` |
| 내보내기 | `/export` | 카드를 골라 README / 이력서 / 자소서로 변환하고 복사한다 | `POST /api/export` |

- API가 실패하면 오류를 그대로 표시한다. `mock-data.ts`로 대체하지 않는다. (데모 화면에서 `mock-data.ts` 사용 금지)
- 카드가 0개일 때의 화면 문구를 둔다. (예: "아직 정리할 트러블슈팅이 없어요")

## API

응답 형식은 성공 `{ data: ... }`, 실패 `{ error: "사람이 읽을 수 있는 메시지" }` (`api-rules.md`).

| Method | 경로 | 하는 일 | 담당 | 상태 |
|---|---|---|---|---|
| POST | `/api/events` | 이벤트를 검증해 저장한다. 요청 `{ source, project_name, session_id, type, payload, collected_at? }`, 성공 201 | be-1 | 구현됨 |
| POST | `/api/sessions/close` | "지금 정리하기". 열린 세션을 닫고 카드를 만든다. 요청 `{ project_name }`으로 그 프로젝트의 가장 최근 열린 세션을 닫는다 **[제안]** | be-2 | 미구현 |
| GET | `/api/cards` | 카드 목록(시간순) | be-2 | 미구현 |
| GET | `/api/cards/[id]` | 카드 상세와 근거 이벤트 | be-2 | 미구현 |
| PATCH | `/api/cards/[id]` | "확인 필요" 칸 수정 | be-2 | 미구현 |
| POST | `/api/export` | 요청 `{ card_ids: string[], format: 'readme' \| 'resume' \| 'cover_letter', options? }`, 결과 `{ data: { text } }` **[제안]** | be-2 | 미구현 |
| GET, POST | `/api/demo-cards` | 리허설에서 만든 카드를 내보내기·복원 (seed 스크립트용) | be-2 | 미구현 |

## 데이터 (Supabase 테이블)

| 테이블 | 컬럼 | 상태 |
|---|---|---|
| `sessions` | id(uuid), source, project_name, external_id, status(`open`/`closing`/`closed`), last_processed_event_id, reason, created_at, closed_at. `status='open'`인 행에만 `(source, project_name, external_id)` unique | 구현됨 (`db/be-1/events.sql`) |
| `events` | id, session_id, source, project_name, type, payload(jsonb), collected_at, created_at. 정렬은 `collected_at`, 같으면 `id` | 구현됨 |
| `cards` | id, session_id, project_name, source, title, situation, problem, action, result, tags(text[]), evidence_event_ids(bigint[]), 확인 필요 표시, created_at **[제안, be-2가 확정]** | 미정 |

- 이벤트 종류(`type`): `prompt`, `shell`, `task_start`, `task_complete`, `subagent`, `file_change`, `agent_stop`, `commit`, `session_end`. payload 모양은 `types/event.ts`.
- `reason` 값: `task_done`, `session_end`, `manual`, `idle` (`closeSession`과 동일).
- RLS는 데모 한정으로 껐다. 데모 후 서버 전용 키로 바꾸고 RLS를 다시 켠다.
- 카드 형식(`types/card.ts`)과 `cards` 스키마는 be-2가 먼저 push하고, fe가 그 모양에 맞춘다.

## LLM 호출

- 호출은 `lib/services/generate-cards.ts` 안의 `callLLM(prompt)` 함수 하나로 감싼다. 새 파일이나 서비스 함수는 만들지 않는다. (`lib/services/` 함수 2개 원칙 유지)
- 제공자는 환경변수 `LLM_PROVIDER`로 고른다.

| `LLM_PROVIDER` | 방식 | 비고 |
|---|---|---|
| `kiro` (기본) | `kiro-cli chat --no-interactive`를 실행하고 프롬프트를 표준입력으로 넘긴다 | 서버를 돌리는 PC에 kiro-cli 설치·로그인 필요. 로컬 데모 전용 (Vercel 배포에서는 쓸 수 없다) |
| `gemini` (대비책) | Google Gemini Flash 무료 등급 API | `GEMINI_API_KEY` 필요 |

- Kiro 출력에는 설명이 섞일 수 있으므로, 응답에서 JSON 부분만 추출해 검증한다. 추출하거나 검증하지 못하면 "LLM 호출 실패 또는 JSON이 아닌 응답"으로 처리한다. (아래 오류 처리)
- 키는 서버 코드에서만 읽고 브라우저로 내보내지 않는다.

## 오류 처리

| 상황 | 처리 |
|---|---|
| 서버가 꺼져 있거나 전송 실패 (hook) | 오류를 무시하고 exit 0. 에이전트 작업을 막지 않는다 |
| 잘못된 이벤트 | `POST /api/events`가 400과 한국어 메시지를 돌려준다 |
| 같은 세션을 동시에 닫음 | 조건부 UPDATE로 먼저 잡은 쪽만 처리, 나머지는 `skipped: true` |
| LLM 호출 실패 또는 JSON이 아닌 응답 | 세션 상태를 되돌려 다시 시도할 수 있게 하고, 오류를 화면에 그대로 알린다. 손으로 만든 카드로 대체하지 않는다 |
| 카드로 만들 트러블슈팅이 없음 | 카드를 만들지 않는다 |
| API 실패 (화면) | 오류를 그대로 표시한다 |

## 테스트 전략

- 이벤트 수신: curl로 정상·잘못된 요청·동시 요청을 확인한다. (be-1 완료)
- 어댑터: `.trace/`의 실제 hook 입력 샘플로 변환 결과를 확인한다. (be-1 완료)
- 통합: 별도 폴더에 `install.sh`로 설치하고 실제 spec 태스크를 실행해, 이벤트가 쌓이고 세션이 닫히고 카드가 생기는지 끝까지 확인한다.
- 데모: `product.md`의 데모 흐름을 순서대로 실행한다. 리허설에서 실제 파이프라인으로 만든 카드를 `seed/`로 저장하고 백업 영상을 녹화한다.
- 모든 작업 끝에 `npm run build`가 통과해야 한다.

## 아직 정해지지 않은 것

- `cards` 스키마와 `types/card.ts` (be-2)
- LLM 제공자, 모델, 키 이름 (PM)
- `POST /api/sessions/close`와 `POST /api/export`의 요청·응답 형식 (be-2, fe 합의)
- 화면 구성과 컴포넌트 (fe)
