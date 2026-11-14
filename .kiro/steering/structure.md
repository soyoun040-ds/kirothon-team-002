---
inclusion: always
---

# Project Structure

```
app/
├─ page.tsx                    카드 목록 (시간순, 출처 배지). 메인 화면
├─ layout.tsx                  공통 레이아웃
├─ cards/[id]/page.tsx         카드 상세 ("확인 필요" 칸 수정)
├─ export/page.tsx             내보내기 화면 (카드 선택 → README / 이력서 / 자소서)
└─ api/
   ├─ events/route.ts          POST /api/events. 모든 도구의 공통 입구. 검증하고 저장만 한다
   ├─ sessions/close/route.ts  POST. 세션 닫기 ("지금 정리하기" 버튼). 서비스 함수를 호출한다
   ├─ cards/route.ts           GET. 카드 목록
   ├─ cards/[id]/route.ts      GET 카드 상세, PATCH "확인 필요" 칸 수정
   ├─ export/route.ts          POST. 선택한 카드를 README / 이력서 / 자소서로 변환
   └─ demo-cards/route.ts      GET 내보내기, POST 복원 (seed 스크립트용)
components/                    재사용 UI 조각 (Button, Card, SourceBadge 등)
lib/
├─ supabase.ts                 Supabase 클라이언트 (한 곳에서만 생성)
├─ mock-data.ts                프론트 개발용 가짜 데이터
└─ services/                   서비스 함수 두 개만 둔다
   ├─ close-session.ts         세션 닫기 (중복 방지 포함)
   └─ generate-cards.ts        카드 생성 (LLM 호출)
types/                         공통 TypeScript 타입 (이벤트·카드 형식)
db/
├─ be-1/                       BE-1의 SQL · 스키마 메모
└─ be-2/                       BE-2의 SQL · 스키마 메모
scripts/
├─ install.sh                  대상 저장소에 어댑터와 git post-commit 설치
└─ hooks/
   ├─ send-event.mjs           공통 전송 스크립트. 마스킹 후 POST /api/events로 전송
   ├─ post-commit              커밋 메시지와 diff를 공통 전송 스크립트로 넘김
   ├─ adapters/                도구별 hook 설정 파일과 변환 스크립트
   │  ├─ kiro/                 (필수)
   │  ├─ claude-code/
   │  └─ cursor/
   └─ probe/                   hook 입력 탐색 테스트용. 확인이 끝나면 지운다
seed/
├─ export-demo-cards.mjs       리허설에서 실제 생성한 카드를 demo-cards.json으로 내보내기
├─ restore-demo-cards.mjs      demo-cards.json을 DB에 다시 넣기
└─ demo-cards.json             데모 카드 백업
docs/                          발표 자료, 데모 시나리오
.kiro/
├─ steering/                   product.md, tech.md, structure.md
└─ specs/                      기능별로 분리: collector, star-engine, web-ui
```

데모용 저장소는 이 저장소 안에 두지 않고 별도 저장소로 만든다.

## 규칙

- 파일 이름: 컴포넌트는 PascalCase(`TodoCard.tsx`), 그 외는 kebab-case.
- 한 파일이 200줄을 넘으면 나눌 것을 고려한다.
- Supabase 클라이언트는 `lib/supabase.ts`에서만 만들고 다른 곳에서는 import한다.
- 서버 API는 `app/api/<기능명>/route.ts`, 기능 폴더 하나는 한 사람이 담당한다.

### 수집 (scripts/hooks/)

- `scripts/hooks/` 바로 아래에는 도구와 무관한 공통 스크립트만 둔다.
- 모든 어댑터와 git post-commit은 반드시 공통 전송 스크립트(`send-event.mjs`)를 통해서만 서버로 전송한다. 마스킹은 이 스크립트에서만 한다.
- 어댑터는 도구의 hook 입력을 공통 이벤트 형식으로 바꿔 공통 전송 스크립트에 넘기는 일만 한다.
- `install.sh`는 `--tool` 옵션으로 어댑터를 지정한다. 옵션이 없으면 대상 저장소의 `.kiro/`, `.claude/`, `.cursor/` 폴더를 보고 자동 선택하고, 아무것도 없으면 kiro를 설치한다. post-commit은 항상 설치한다.
- 스크립트는 Node로 바로 실행되는 `.mjs`로 쓰고, 새 패키지를 추가하지 않는다. DB 접근은 API route를 호출해서 한다(스크립트에서 Supabase 클라이언트를 따로 만들지 않는다).

### 서버

- `app/api/events/route.ts`는 이벤트를 검증해서 저장하는 일만 한다.
- route 파일은 `lib/services/`의 함수를 호출하는 얇은 층이다. 세션 닫기와 카드 생성 로직을 route 안에 직접 쓰지 않는다.
- `lib/services/`에는 세션 닫기 함수와 카드 생성 함수 두 개만 둔다. 웹 "지금 정리하기" 버튼과 나중의 MCP도 같은 함수를 쓴다.

### 프론트

- `lib/mock-data.ts`는 프론트 개발용이다. 데모 화면에서 쓰지 않고, API 오류의 대체 데이터로도 쓰지 않는다. API가 실패하면 오류를 그대로 표시한다.

## 담당

| 폴더 | 담당 |
|---|---|
| `scripts/hooks/`, `scripts/install.sh`, 이벤트 수신 route, `db/be-1/` | be-1 |
| `lib/services/`, 세션 닫기·카드·내보내기 route, `seed/`, `db/be-2/` | be-2 |
| 프론트 화면(`app/**/page.tsx`), `components/`, `lib/mock-data.ts` | fe |
| `.kiro/steering/`, `.kiro/specs/`, `docs/`, 데모용 저장소 | PM |

- 각자 담당 폴더만 수정하고, 다른 폴더는 담당자에게 요청한다.
- `db/be-1/`은 be-1, `db/be-2/`는 be-2의 SQL 폴더다. 다른 사람 폴더는 수정하지 않는다.
- 공통 이벤트·카드 형식(`types/`)과 공통 테이블 스키마는 변경 시 전원 합의한다.

## 브랜치

- 코드: `be-1`, `be-2`, `fe` 브랜치에서 작업하고, 확인 시점마다 main에 합친다. main에는 동작하는 코드만 병합한다. 자세한 규칙은 AGENTS.md.
- steering 문서(`.kiro/steering/`): main에 직접 커밋한다. 수정 후 팀원은 main을 자기 브랜치에 merge한다.
- steering 문서는 PM만 수정한다.
