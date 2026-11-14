---
inclusion: always
---

# Tech Stack

이 스택만 사용한다. 다른 프레임워크나 클라우드 서비스를 제안하지 말 것.
**AWS 서비스(Lambda, DynamoDB, Amplify, Cognito 등)는 사용자가 직접 요청할 때만 사용한다.**

## 사용 기술

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router), TypeScript |
| 스타일 | Tailwind CSS |
| 서버 로직 | Next.js Route Handlers (`app/api/**/route.ts`) |
| DB · 로그인 | Supabase (Postgres + Auth), `@supabase/supabase-js` |
| 배포 | Vercel |
| 패키지 매니저 | npm |

## 원칙

- 단순함 우선. 팀원 대부분이 초보이므로 추상화 계층을 늘리지 않는다.
  - 예외: `lib/services/`의 세션 닫기 함수와 카드 생성 함수 두 개만 둔다. 그 이상의 계층이나 추상화는 만들지 않는다.
- 상태 관리 라이브러리(Redux 등)는 쓰지 않는다. React 기본 기능(useState 등)으로 해결.
- 데이터는 Supabase에 저장한다. 데모용 가짜 데이터가 필요하면 `lib/mock-data.ts`에 둔다.
- 환경 변수는 `.env.local`에 둔다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 외부 AI API를 쓸 경우 키는 서버 코드(`app/api/`)에서만 사용하고 브라우저로 노출하지 않는다.

## 주제가 데이터 분석·AI 모델 중심일 경우

Python 라이브러리가 꼭 필요하면 서버 로직만 FastAPI(Python)로 분리할 수 있다.
그 경우 이 파일의 표를 먼저 수정한 뒤 작업한다.

## 세션 종료와 카드 생성 (구현 규칙)

세션은 "이벤트 묶음"이다. 세션이 닫히면 서버(Route Handler)가 카드 생성을 한 번 실행한다.

### 로직 분리 원칙

- 세션 닫기와 카드 생성 로직은 route 파일 안에 직접 쓰지 않고, `lib/services/`의 함수로 분리한다. `lib/services/`에는 세션 닫기 함수와 카드 생성 함수 두 개만 둔다.
- route 파일은 요청을 받아 이 함수를 호출하는 얇은 층으로만 둔다. `POST /api/events` route는 이벤트를 검증해서 저장하는 일만 한다.
- 이유: 수집 경로(hook)와 무관하게 다른 입구(웹의 "지금 정리하기" 버튼, 나중에 추가할 MCP)에서도 같은 함수를 재사용하기 위해서다.

### 이벤트 형식

- 모든 이벤트는 `source`(`kiro`, `claude-code`, `cursor`)와 `project_name`을 포함한다.
- 세션 ID는 도구가 주면 그것을 쓰고, 없으면 대상 저장소 `.cvagent/`의 세션 ID를 쓴다.
- 도구별 입력 형식 차이는 `scripts/hooks/adapters/<도구이름>/`에서 흡수하고, 서버에는 도구와 무관한 공통 형식으로 보낸다.

### 세션을 닫는 경로

| 순위 | 경로 | 구현 |
|---|---|---|
| 기본 | 도구별 세션 종료 | kiro: spec 태스크 완료(`PostTaskExec` hook)가 셸 명령으로 서버에 이벤트를 보낸다. 태스크의 spec 내용(요구사항, 태스크 설명)을 세션에 함께 저장한다. claude-code, cursor: 각 도구의 세션 종료 hook이 이벤트를 보낸다. 서버는 이 이벤트를 받으면 해당 세션을 닫는다. |
| 보조 | 웹 "지금 정리하기" 버튼 | 버튼이 API를 호출해 현재 열린 세션을 즉시 닫는다. 데모에서는 자동 경로가 실패했을 때 사용한다. Kiro 수동 트리거 hook은 쓰지 않는다. |
| 선택 | 20분 무입력 | 모든 도구에 공통으로 적용한다. 시간이 남을 때만 만든다. 스케줄러·cron은 만들지 않는다. 새 이벤트 수신 시, 그리고 웹 화면을 열 때 "열린 세션의 마지막 이벤트와 현재(또는 새 이벤트) 시각 차이가 20분 이상"이면 이전 세션을 닫는다. |

- 에이전트 응답 종료(Agent Stop) hook은 세션을 닫지 않는다. `agent_stop` 이벤트로만 저장한다.

### 중복 방지

- 세션 행에 마지막으로 처리한 이벤트 위치(예: `last_processed_event_id`)를 저장한다. 카드 생성은 그 이후 이벤트만 사용하고, 끝나면 위치를 갱신한다.
- 여러 경로가 같은 세션을 동시에 닫으려 해도 한 번만 처리한다. 세션 상태를 조건부 UPDATE(`open` → `closing`, 영향받은 행이 1일 때만 진행)로 바꿔 먼저 잡은 쪽만 카드 생성을 실행한다.
- 카드 생성이 실패하면 상태를 되돌려 다시 시도할 수 있게 한다.

### 보안

- 이벤트는 서버로 보내기 전에 API 키, 토큰, `.env` 내용을 마스킹한다.
- 마스킹은 `scripts/hooks/` 아래 공통 전송 스크립트(`send-event.mjs`) 하나에서 처리한다. 모든 어댑터와 git post-commit 스크립트는 이 공통 스크립트를 통해서만 서버로 전송한다. 어댑터마다 마스킹을 따로 구현하지 않는다.
- 서버도 LLM에 보내기 직전에 같은 패턴으로 한 번 더 마스킹한다. (안전장치)
- LLM API 키는 `app/api/`의 서버 코드에서만 쓴다.

## 다중 저장소 수집과 설치 스크립트

수집 대상은 이 제품 저장소와 별도의 데모용 저장소, 두 곳 이상이다.

- `scripts/install.sh`를 대상 저장소에서 실행하면 다음을 설치한다.
  - 도구별 어댑터 (`scripts/hooks/adapters/<도구이름>/`). 예: kiro는 `.kiro/hooks/` 아래 hook 파일들 (프롬프트, 셸 결과, PostTaskExec, Agent Stop)
  - `.git/hooks/post-commit`: 도구와 무관하게 항상 설치한다.
  - 서버 주소와 프로젝트 이름 설정 (설치 시 입력받아 대상 저장소의 설정 파일에 저장)
- 설치할 어댑터 고르는 방법:
  - `--tool` 옵션으로 지정한다. 여러 개 가능. (예: `--tool kiro,claude-code`)
  - 옵션이 없으면 대상 저장소에 `.kiro/`, `.claude/`, `.cursor/` 폴더가 있는지 보고 해당 어댑터를 자동으로 설치한다.
  - 아무 폴더도 없으면 kiro 어댑터를 설치한다.
- 모든 이벤트와 커밋 데이터에 `project_name`을 포함한다. 세션, 이벤트, 커밋, 카드 모두 프로젝트 이름으로 구분되고, 화면에서 저장소별로 필터할 수 있어야 한다.
- 이 제품 저장소에도 같은 스크립트로 설치해서 우리 개발 과정의 카드도 수집한다.
- 데모 시연은 데모용 저장소에서 `install.sh`를 실행하는 장면부터 시작한다.
- Windows에서는 Git Bash로 실행한다.
- hook이 보내는 데이터는 공통 전송 스크립트에서 마스킹한 뒤 서버로 보낸다. (위 "보안" 참고)

## 데모 카드 백업과 복원

- 데모에 쓰는 카드는 리허설에서 데모 시나리오를 실제 파이프라인으로 실행해 생성된 것만 쓴다. 손으로 만든 카드는 쓰지 않는다.
- `seed/export-demo-cards.mjs`: 생성된 카드를 `seed/demo-cards.json`으로 내보낸다.
- `seed/restore-demo-cards.mjs`: `seed/demo-cards.json`을 DB에 다시 넣는다. 이미 있는 카드는 중복으로 넣지 않는다.
- 두 스크립트는 `app/api/demo-cards/route.ts`(GET 내보내기, POST 복원)를 호출한다. Supabase 클라이언트는 `lib/supabase.ts` 하나만 쓴다.
- `lib/mock-data.ts`는 프론트 개발용으로만 유지한다. 데모 화면에서는 쓰지 않고, API 오류가 나도 mock-data로 대체하지 않는다. 오류를 그대로 화면에 표시한다.
