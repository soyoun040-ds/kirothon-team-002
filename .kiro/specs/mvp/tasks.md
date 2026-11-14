# Implementation Plan

> design.md는 PM·FE가 정한다. 각 task 제목의 **(be-1) (be-2) (fe) (PM)** 은 담당이다. **자기 담당 task만 실행한다.** 다른 담당 task는 실행하지 않고 담당자에게 알린다. (`AGENTS.md` 폴더 소유 참고)
> 17:00 기능 동결. 시간이 모자라면 아래에서부터 뺀다: 자소서 초안 → 이력서 → post-commit·claude-code·cursor → 20분 무입력.

- [x] 1. (be-1) 이벤트 형식과 DB 스키마
  - `types/event.ts`, `db/be-1/events.sql` (sessions, events), `db/be-1/design-notes.md`
  - _Requirements: 1.8, 2.1_

- [x] 2. (be-1) 이벤트 수신 route `POST /api/events`
  - 검증, 열린 세션 찾기·만들기(동시 요청 처리), 저장만 한다
  - _Requirements: 1.8, 2.1_

- [x] 3. (be-1) 공통 전송 스크립트 `scripts/hooks/send-event.mjs`
  - 마스킹(비밀 키, 홈 경로 이름), 길이 제한, 수집 시각, 항상 exit 0, 5초 제한
  - _Requirements: 1.9, 1.10, 1.11_

- [x] 4. (be-1) Kiro 어댑터와 hook 설정
  - `scripts/hooks/adapters/kiro/` (adapter.mjs, hooks.json, NOTES.md)
  - _Requirements: 1.1–1.7_

- [x] 5. (be-1) 설치 스크립트 `scripts/install.sh`
  - _Requirements: 1.12_

- [ ] 6. (be-1) 별도 폴더에서 설치하고 실제 spec 태스크를 실행해 이벤트가 쌓이는지 확인
  - 확인: `task_start`, `task_complete`, `shell`이 쌓이고 `task_complete`의 `spec` 내용이 채워지는지
  - 데모용 저장소가 준비되면 같은 방식으로 한 번 더 확인한다
  - _Requirements: 1.5, 6.1_

- [ ] 7. (be-2) 공통 카드 형식 `types/card.ts`와 cards 테이블 스키마(`db/be-2/`)
  - 전원 합의 필요. 정해지면 바로 push하고 fe·be-1에 알린다
  - _Requirements: 3.2_

- [ ] 8. (be-2) `lib/services/close-session.ts`
  - 먼저 껍데기라도 push (be-1이 호출을 연결해야 한다)
  - `closeSession(sessionId, reason)`, reason은 `task_done | session_end | manual | idle`
  - open→closing 조건부 갱신으로 중복 방지, 이미 닫혔으면 `skipped: true`, 실패 시 상태 되돌리기
  - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [ ] 9. (be-1) `task_complete` 이벤트를 저장한 뒤 `closeSession(sessionId, 'task_done')` 호출 연결
  - task 8이 push된 뒤에 한다. `lib/services/`는 수정하지 않는다
  - _Requirements: 2.2_

- [ ] 10. (be-2) `lib/services/generate-cards.ts`
  - 세션 이벤트와 spec 내용으로 LLM 호출, JSON 카드 0~3개, "확인 필요" 표시, 사소한 수정 제외, 실패 후 성공 흐름 우선
  - 서버에서만 호출, LLM 직전 마스킹 한 번 더, 실패 시 오류를 그대로 알림
  - _Requirements: 3.1–3.9_

- [ ] 11. (be-2) `POST /api/sessions/close` ("지금 정리하기")
  - _Requirements: 2.3_

- [ ] 12. (be-2) 카드 API: `GET /api/cards`, `GET`·`PATCH /api/cards/[id]`
  - _Requirements: 4.1–4.3_

- [ ] 13. (be-2) `POST /api/export`
  - README 트러블슈팅 섹션을 먼저, 이력서 한 줄, 시간이 남으면 자소서 초안
  - _Requirements: 5.1–5.5_

- [ ] 14. (fe) 카드 목록·카드 상세·내보내기 화면 뼈대
  - `app/page.tsx`, `app/cards/[id]/page.tsx`, `app/export/page.tsx`, 출처 배지
  - 가짜 데이터는 개발용으로만 쓴다
  - _Requirements: 4.1, 4.2, 4.6_

- [ ] 15. (fe) 실제 API 연결과 "지금 정리하기" 버튼
  - task 11, 12가 push된 뒤에 한다. API가 실패하면 오류를 그대로 표시하고 `mock-data.ts`로 대체하지 않는다
  - "확인 필요" 칸 수정(`PATCH`), 내보내기 복사 버튼
  - _Requirements: 4.3, 4.4, 4.5, 5.5_

- [ ] 16. (be-2) 데모 카드 백업·복원: `app/api/demo-cards/route.ts`, `seed/export-demo-cards.mjs`, `seed/restore-demo-cards.mjs`
  - _Requirements: 6.3_

- [ ] 17. (PM) 데모용 저장소 준비
  - spec(요구사항, 설계, 태스크)과 실패하는 테스트, `install.sh`로 hook 설치, 사전 체크리스트 확인
  - _Requirements: 6.1, 6.2_

- [ ] 18. (전원) 리허설과 카드 저장, 백업 영상
  - 실제 파이프라인으로 데모 흐름 실행, 생성된 카드를 `seed/demo-cards.json`으로 내보내고 복원 확인, 같은 흐름 녹화
  - 17:00 기능 동결 이후에 한다
  - _Requirements: 6.3, 6.4, 6.5_

- [ ] 19. (PM) 제출물 확인과 제출 (18:00)
  - 제출 형식(레포, 영상, 설명)을 먼저 확인한다
  - _Requirements: 6_

- [ ] 20. (be-1, 후순위) git `post-commit`과 claude-code·cursor 어댑터
  - 두 도구의 hook 입력 형식을 `scripts/hooks/probe/`로 직접 찍어 확인한 뒤 만든다. 1–19가 끝난 뒤에만 한다
  - _Requirements: 1.13_
