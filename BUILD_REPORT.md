# BUILD REPORT

Kiro로 기획부터 검증까지 진행했고, 제품 자체도 Kiro의 hook과 Kiro CLI를 엔진으로 씁니다.

## Kiro 활용 내역

| 단계 | 사용한 Kiro 기능 | 무엇을 했는지 | 결과물 위치 |
|---|---|---|---|
| 기획 | Steering | 제품 목표·범위·제외 항목, 기술 스택, 폴더 구조와 담당을 steering 문서로 정리해 모든 대화에 자동 적용 | `.kiro/steering/product.md`, `tech.md`, `structure.md`, `api-rules.md` |
| 기획 | Spec (requirements) | 수집·세션·카드·타임라인·내보내기·데모 6개 요구사항을 EARS 수락 기준으로 작성 | `.kiro/specs/mvp/requirements.md` |
| 설계 | Spec (design) | 전체 흐름(hook → 어댑터 → 이벤트 API → 세션 닫기 → 카드 생성), API·테이블·오류 처리 설계 | `.kiro/specs/mvp/design.md` |
| 설계 | Spec (tasks) | 담당(be-1·be-2·fe·PM)별 20개 작업과 의존 순서로 분해 | `.kiro/specs/mvp/tasks.md` |
| 구현 | Agent Hooks (실험) | stdin 덤프 hook으로 Kiro hook이 넘기는 실제 데이터(프롬프트, 셸 결과·종료 코드, 서브에이전트 보고, 태스크 시작·완료)를 직접 확인하고 문서화 | `scripts/hooks/adapters/kiro/NOTES.md`, `scripts/hooks/probe/` |
| 구현 | Agent Hooks (제품 엔진) | UserPromptSubmit, PostToolUse, PreTaskExec, PostTaskExec, Stop hook으로 작업 과정을 자동 수집 | `.kiro/hooks/cv-agent.json`, `scripts/hooks/adapters/kiro/hooks.json` |
| 구현 | Kiro CLI (headless) | `kiro-cli chat --no-interactive`를 카드·보고서 생성 LLM으로 사용 | `lib/services/generate-cards.ts`, `app/api/projects/[name]/report/route.ts` |
| 구현 | Spec 태스크 실행 | 데모 저장소의 spec 태스크를 실행해 실패 → 수정 → 통과 흐름과 태스크 완료 이벤트로 카드 자동 생성 | 데모 저장소(`demo` 브랜치) `.kiro/specs/schedule-timezone/` |
| 검증 | Custom agent | 파일을 수정하지 않는 리뷰어 agent로 변경 사항 점검 | `.kiro/agents/reviewer.md` |
| 검증 | Skill | 데모 전 점검 절차(빌드, 데모 시나리오, 콘솔 에러, 키 노출) | `.kiro/skills/demo-check/SKILL.md` |
| 기타 | MCP | Playwright MCP로 화면 확인 | `.kiro/settings/mcp.json` |

## 개발 과정에서 바뀐 점

- 처음에는 git 커밋만 수집하려 했지만, "왜 그렇게 판단했는지"가 남지 않아 Kiro hook으로 프롬프트·실행 결과·태스크 단위를 수집하도록 바꿨다.
- 카드 생성 LLM을 별도 API 키 대신 Kiro CLI로 바꿔 Kiro만으로 동작하게 했다.
- 트러블 하나씩의 카드만으로는 포트폴리오가 국소적이어서, 프로젝트 전체 보고서(무엇인지·내가 한 일·어려움·해결)를 추가했다.

## 어려웠던 점과 해결 방법

- **hook이 동작하지 않음**: 옛 `.kiro.hook` 형식을 썼고, 워크스페이스를 Trust하지 않았으며, 바깥 폴더를 열고 있었다. Kiro 코드와 로그로 원인을 찾아 `.kiro/hooks/*.json`(v1) 형식, Trust, 창 다시 로드로 해결했다.
- **실패한 테스트가 성공으로 기록됨**: 에이전트가 `npm test | Select-Object`처럼 파이프로 실행하면 종료 코드가 0이 된다. 출력의 실패 흔적으로 `looks_failed`를 표시하도록 어댑터를 고쳤다.
- **파일 수정이 수집되지 않음**: 서브에이전트가 `fs_write`가 아니라 `str_replace`로 파일을 고쳤다. 수집 대상에 추가했다.
- **빈 세션 문제**: 태스크 완료 직후 오는 응답 종료 이벤트가 빈 세션을 만들어 "지금 정리하기"가 카드 0개를 냈다. 열린 세션이 없으면 저장하지 않도록 고쳤다.
- **설치 입력 오류**: 설치 중 방향키 입력이 서버 주소에 섞여 수집이 조용히 실패했다. 입력 검사와 기본값 대체를 넣었다.
