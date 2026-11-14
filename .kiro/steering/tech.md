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
| DB | Supabase (Postgres), `@supabase/supabase-js`. 로그인(Auth)은 사용하지 않는다. |
| 수집 어댑터 | Node `.mjs` 스크립트, 외부 패키지 없이 작성. 위치는 `scripts/hooks/adapters/<도구이름>/` |
| LLM | 미정. 정해지기 전에는 임의로 고르지 말고 사용자에게 물을 것. |
| 배포 | Vercel |
| 패키지 매니저 | npm |

## 원칙

- 단순함 우선. 팀원 대부분이 초보이므로 추상화 계층을 늘리지 않는다.
- 상태 관리 라이브러리(Redux 등)는 쓰지 않는다. React 기본 기능(useState 등)으로 해결.
- 데이터는 Supabase에 저장한다. `lib/mock-data.ts`는 개발 중 임시용으로만 쓰고 데모 화면에는 쓰지 않는다.
- 환경 변수는 `.env.local`에 둔다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 외부 AI API를 쓸 경우 키는 서버 코드(`app/api/`)에서만 사용하고 브라우저로 노출하지 않는다.
- 라우트 파일에 `export const dynamic = ...`를 쓰지 않는다. 이 Next.js 버전은 `cacheComponents`와 맞지 않아 오류가 난다.

## 주제가 데이터 분석·AI 모델 중심일 경우

Python 라이브러리가 꼭 필요하면 서버 로직만 FastAPI(Python)로 분리할 수 있다.
그 경우 이 파일의 표를 먼저 수정한 뒤 작업한다.
