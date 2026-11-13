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
   └─ (기능명)/route.ts   서버 API. 기능별로 폴더 하나
components/              재사용 UI 조각 (Button, Card 등)
lib/
├─ supabase.ts           Supabase 클라이언트 (한 곳에서만 생성)
└─ mock-data.ts          데모용 가짜 데이터
types/                   공통 TypeScript 타입
db/
├─ be-1/                 BE-1의 SQL · 스키마 메모
└─ be-2/                 BE-2의 SQL · 스키마 메모
```

## 규칙

- 파일 이름: 컴포넌트는 PascalCase(`TodoCard.tsx`), 그 외는 kebab-case.
- 한 파일이 200줄을 넘으면 나눌 것을 고려한다.
- Supabase 클라이언트는 `lib/supabase.ts`에서만 만들고 다른 곳에서는 import한다.
- 역할 분담 기준:
  - 화면(`app/**/page.tsx`, `components/`) → 프론트엔드 담당
  - 서버 API(`app/api/`)와 DB(Supabase) → 백엔드 담당
- 브랜치는 `be-1`, `be-2`, `fe`로 나눠 작업하고 main에는 동작하는 코드만 병합한다. 자세한 규칙은 AGENTS.md.
