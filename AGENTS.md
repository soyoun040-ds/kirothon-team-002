# AGENTS.md

이 프로젝트에서 일하는 모든 agent와 팀원이 따르는 기본 명령과 규칙.

## 명령어

| 목적 | 명령 |
|---|---|
| 패키지 설치 | `npm install` |
| 개발 서버 실행 | `npm run dev` → http://localhost:3000 |
| 빌드 확인 | `npm run build` |
| 린트 | `npm run lint` |

## 작업 규칙

- 큰 작업(파일 여러 개 수정)을 시작하기 전에 사용자에게 git commit을 권할 것.
- 작업이 끝나면 `npm run build`가 통과하는지 확인할 것.
- 새 패키지는 꼭 필요할 때만 추가하고, 추가했다면 이유를 알려 줄 것.
- 비밀 키(API key, Supabase key)는 `.env.local`에만 두고 코드에 직접 쓰지 말 것.
- 팀원 대부분이 초보이므로, 변경 내용을 짧고 쉬운 한국어로 요약할 것.

## Git 규칙 (팀 4명: BE 2, FE 1, PM 1)

- 브랜치: `main`(항상 돌아가는 상태만), `be-1`, `be-2`, `fe`. **각자 자기 브랜치에서만 작업**한다. main에 직접 작업하지 않는다.
  - 예외: `.kiro/steering/` 문서는 PM이 main에 직접 커밋한다. 그 외 모든 코드와 문서는 각자 브랜치에서 작업한다.
- 현재 브랜치를 먼저 확인할 것(`git branch --show-current`). 자기 브랜치가 아니면 작업을 멈추고 알려 줄 것. 단, steering 문서 수정은 main에서 한다.
- 작업 시작 전: `git pull origin main` 후 `git merge main`으로 최신 main을 자기 브랜치에 합친다.
- 기능 하나가 끝나고 `npm run build`가 통과하면 commit → `git push origin <자기 브랜치>`.
- main 병합은 build 통과를 확인한 뒤에만 하고, 병합 직후 `git push origin main`.
- 충돌이 나면 임의로 해결하지 말고, 충돌 파일과 양쪽 내용을 쉬운 말로 설명한 뒤 사용자에게 어느 쪽을 쓸지 묻는다.
- `git push --force`, `git reset --hard`는 사용자가 명시적으로 요청하지 않으면 쓰지 않는다.
- 공용 파일(`package.json`, `lib/supabase.ts`, `types/`)은 수정 전에 팀에 알린다.
- 마감 1시간 전(17:00)부터는 main에 새 기능을 병합하지 않고 데모 점검만 한다.
- commit 메시지는 짧은 한국어 한 줄. 예: `로그인 API 추가`

## 폴더 소유

- `db/be-1/`, `db/be-2/`: BE 각자의 SQL·스키마 메모. 다른 사람 폴더는 수정하지 않는다.
- `app/api/<기능명>/`: 기능 폴더 하나는 한 사람이 담당한다. 시작 전에 담당자를 정한다.
- 화면(`app/**/page.tsx`, `components/`)은 FE 담당.
- PM: `.kiro/steering/`, `docs/`, 데모용 저장소. steering 문서는 PM만 수정한다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
