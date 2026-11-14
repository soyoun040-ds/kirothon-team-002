---
inclusion: always
---

# Project Structure

```
app/
├─ page.tsx              메인 화면
├─ layout.tsx            공통 레이아웃
├─ (페이지명)/page.tsx    추가 화면은 폴더 하나에 page.tsx 하나
└─ api/
   ├─ (기능명)/route.ts   서버 API. 기능별로 폴더 하나
   └─ events/route.ts     POST /api/events. 모든 도구(kiro, claude-code, cursor)가 쓰는 공통 입구
components/              재사용 UI 조각 (Button, Card 등)
lib/
├─ supabase.ts           Supabase 클라이언트 (한 곳에서만 생성)
├─ mock-data.ts          프론트 개발용 가짜 데이터 (데모 화면에서는 사용하지 않음)
└─ services/             route에서 호출하는 서비스 함수 (세션 닫기, 카드 생성 등)
   ├─ close-session.ts   세션 닫기 (중복 방지 포함)
   └─ generate-cards.ts  카드 생성 (LLM 호출)
types/                   공통 TypeScript 타입
db/
├─ be-1/                 BE-1의 SQL · 스키마 메모
└─ be-2/                 BE-2의 SQL · 스키마 메모
scripts/
├─ install.sh            대상 저장소에 수집 hook 설치
├─ hooks/                install.sh가 복사하는 hook 원본
│  ├─ send-event.mjs     공통 전송 스크립트. 마스킹 후 서버로 전송. 모든 어댑터와 post-commit이 이것만 거쳐 보낸다
│  ├─ post-commit        도구와 무관한 공통 스크립트는 hooks/ 바로 아래에 둔다
│  └─ adapters/          도구별 어댑터. 도구 하나에 폴더 하나
│     ├─ kiro/           (.kiro/hooks용 JSON 등)
│     ├─ claude-code/
│     └─ cursor/
├─ export-demo-cards.mjs 생성된 카드를 seed/demo-cards.json으로 내보내기
└─ restore-demo-cards.mjs seed/demo-cards.json을 DB에 다시 넣기
seed/
└─ demo-cards.json       리허설에서 실제 파이프라인으로 만든 데모 카드 백업
```

## 규칙

- 파일 이름: 컴포넌트는 PascalCase(`TodoCard.tsx`), 그 외는 kebab-case.
- 한 파일이 200줄을 넘으면 나눌 것을 고려한다.
- Supabase 클라이언트는 `lib/supabase.ts`에서만 만들고 다른 곳에서는 import한다.
- 역할 분담 기준:
  - 화면(`app/**/page.tsx`, `components/`) → 프론트엔드 담당
  - 서버 API(`app/api/`)와 DB(Supabase) → 백엔드 담당
- `scripts/`와 `seed/`는 백엔드 담당. 스크립트는 Node로 바로 실행되는 `.mjs`로 쓰고, 새 패키지를 추가하지 않는다. DB 접근은 `app/api/demo-cards/route.ts`를 호출해서 한다(스크립트에서 Supabase 클라이언트를 따로 만들지 않는다).
- `app/api/events/route.ts`는 이벤트를 검증해서 저장하는 일만 한다. 세션 닫기와 카드 생성은 `lib/services/`의 함수를 호출한다. route 안에 직접 쓰지 않는다.
- 화면은 API가 실패하면 `lib/mock-data.ts`로 대체하지 말고 오류를 그대로 표시한다.
- 브랜치는 `be-1`, `be-2`, `fe`로 나눠 작업하고 main에는 동작하는 코드만 병합한다. 자세한 규칙은 AGENTS.md.
- 예외: steering 문서(`.kiro/steering/`)는 main에 직접 커밋한다. 코드는 각자 브랜치(`be-1`, `be-2`, `fe`)에서 작업한다.
