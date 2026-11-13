# KIROTHON 템플릿 사용법

## 들어 있는 것

| 파일 | 역할 | 언제 채우나 |
|---|---|---|
| `AGENTS.md` | 실행 명령과 작업 규칙 | 완성됨 |
| `.kiro/steering/tech.md` | 스택: Next.js + Supabase, AWS 제안 금지 | 완성됨 |
| `.kiro/steering/structure.md` | 폴더 구조와 역할 분담 | 완성됨 |
| `.kiro/steering/api-rules.md` | `app/api` 파일 다룰 때만 적용되는 규칙 (fileMatch) | 완성됨 |
| `.kiro/steering/product.md` | 주제, 핵심 기능, 데모 시나리오 | **당일 주제 공개 후** |
| `.kiro/agents/reviewer.md` | 읽기만 하는 리뷰 agent | 완성됨 |
| `.kiro/settings/mcp.json` | Playwright MCP (agent가 화면을 직접 열어 확인) | 완성됨 |
| `.kiro/specs/mvp/` | requirements · design · tasks 빈 양식 | 당일 Kiro에게 채우게 함 |
| `.kiro/hooks/` | Hook 자리 (비어 있음) | 당일 IDE 버튼으로 생성 |
| `.kiro/skills/demo-check/` | 데모 전 점검 skill | 완성됨. 채팅에 "데모 점검해줘" |

## 당일 순서

1. 이 폴더를 Kiro IDE에서 **Open a project**로 열고, 위쪽 배너에서 **Trust** 선택
2. 터미널에서 `git init` → `git add .` → `git commit -m "템플릿"`
3. 주제 공개 → 팀이 같이 `product.md` 빈칸 채우기 (15분 이내)
4. Kiro 채팅에 요청:
   `현재 폴더에 Next.js(App Router, TypeScript, Tailwind) 프로젝트를 만들어줘. .kiro 폴더와 AGENTS.md는 유지해.`
5. 👻 Kiro 메뉴 → Specs → + → **Quick Spec**으로 MVP 기능 Spec 생성 → 검토 → Run all tasks
6. 기능 하나 완성될 때마다 commit

## 당일 IDE에서 만들 것 (버튼으로 만드는 게 안전)

**Hook**: 👻 → Agent Hooks → + 누르고 아래 문장 입력
> app 또는 components 폴더의 .ts, .tsx 파일을 저장하면 `npm run lint`를 Shell Command로 실행해줘

**Powers**: 👻 → Powers에서 **Supabase** 설치 (DB 작업을 agent가 바로 할 수 있음)

## 주의

- `.kiro`처럼 점(.)으로 시작하는 폴더는 Windows 탐색기에서 안 보일 수 있음. Kiro IDE에서는 보임.
- `agents/reviewer.md`, `mcp.json`이 메뉴에 안 잡히면 형식이 버전마다 다를 수 있으니, IDE 메뉴의 + 버튼으로 같은 내용을 다시 만들면 됨.
- Supabase URL과 키는 `.env.local`에 넣고 **절대 commit하지 않기** (.gitignore에 이미 포함됨).
