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
