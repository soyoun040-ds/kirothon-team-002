# Requirements – MVP

> 기준 문서: `.kiro/steering/product.md`, `tech.md`, `structure.md`. 수락 기준은 EARS 표기("WHEN (상황) THE SYSTEM SHALL (동작)").
> Kiro hook이 실제로 넘겨주는 데이터는 `scripts/hooks/adapters/kiro/NOTES.md`(실험으로 확인한 사실)를 따른다. 그 문서와 다르게 추측하지 않는다.

## 용어

- **이벤트**: hook이 보낸 한 건의 기록. 종류(type): `prompt`, `shell`, `task_start`, `task_complete`, `subagent`, `file_change`, `agent_stop`, `commit`, `session_end`. 형식은 `types/event.ts`.
- **세션**: 카드 한 번의 생성 단위로 묶은 이벤트 묶음. 상태는 `open` → `closing` → `closed`.
- **카드**: 세션에서 찾은 트러블슈팅 하나를 STAR 구조로 정리한 결과.

## Requirement 1: 작업 이벤트 수집 (be-1)

**User Story:** Kiro로 바이브코딩하는 학생으로서, 따로 기록하지 않아도 작업 과정이 서버에 쌓이길 원한다. 그래야 나중에 판단과 해결 과정을 포트폴리오로 만들 수 있다.

### Acceptance Criteria
1. WHEN 사용자가 프롬프트를 보내면 THE SYSTEM SHALL `prompt` 이벤트로 저장한다.
2. WHEN 셸 명령이 실행되면 THE SYSTEM SHALL 명령어, 종료 코드, 출력의 끝부분을 `shell` 이벤트로 저장한다. 실패(종료 코드가 0이 아님)도 오류 출력과 함께 저장한다.
3. WHEN 서브에이전트가 끝나면 THE SYSTEM SHALL 요청과 보고문을 `subagent` 이벤트로 저장한다.
4. WHEN 파일이 수정되면 THE SYSTEM SHALL **경로만** `file_change`로 저장하고 파일 내용은 저장하지 않는다.
5. WHEN spec 태스크가 시작되거나 끝나면 THE SYSTEM SHALL `task_start`, `task_complete`(성공 여부 `task_success`와 spec 내용 포함)를 저장한다.
6. WHEN 에이전트 응답이 끝나면 THE SYSTEM SHALL `agent_stop`을 저장한다. 세션을 닫지 않는다.
7. THE SYSTEM SHALL 읽기 도구(`read_file`, `list_directory` 등) 이벤트를 저장하지 않는다.
8. THE SYSTEM SHALL 모든 도구가 공통으로 쓰는 `POST /api/events`로 이벤트를 받고, 검증하고 저장하는 일만 한다. 도구별 차이는 `scripts/hooks/adapters/<도구이름>/`이 흡수한다.
9. WHEN 이벤트를 서버로 보내기 전이면 THE SYSTEM SHALL 공통 전송 스크립트(`send-event.mjs`)에서 비밀 정보(`KEY=`, `TOKEN=` 등의 값, `sk-`, `eyJ`, `sb_publishable_`, `sb_secret_`, `AKIA`, `.env` 내용)와 사용자 홈 폴더 경로의 이름(`C:\Users\<이름>` → `~`)을 마스킹한다. 마스킹은 이 한 곳에서만 한다.
10. THE SYSTEM SHALL 저장 전에 길이를 제한한다: 셸 출력 끝 40줄 또는 4,000자, 프롬프트 2,000자, 서브에이전트 보고문·spec 내용 3,000자.
11. IF 서버가 꺼져 있거나 전송이 실패하면 THEN THE SYSTEM SHALL 오류를 무시하고 정상 종료(exit 0)하며 에이전트 작업을 막지 않는다. 전송 제한 시간은 5초.
12. WHEN 사용자가 대상 저장소에서 `scripts/install.sh`를 실행하면 THE SYSTEM SHALL 전송 스크립트, Kiro 어댑터, `.kiro/hooks/cv-agent.json`, `.cvagent/config.json`(서버 주소, project_name)을 설치한다.
13. WHERE 시간이 남으면 THE SYSTEM SHALL git `post-commit`(source: git)과 claude-code·cursor 어댑터를 추가한다. 이 도구들의 hook 입력 형식은 아직 확인되지 않았으므로, 구현 전에 실제 입력을 찍어 확인한다. (후순위)

## Requirement 2: 세션과 닫기 (be-1 이벤트 수신, be-2 서비스)

**User Story:** 사용자로서, 작업 단위가 자동으로 묶여 카드가 만들어지길 원한다. 그래야 따로 "끝났다"고 알리지 않아도 된다.

### Acceptance Criteria
1. WHEN 이벤트가 오면 THE SYSTEM SHALL `(source, project_name, session_id)`로 열린 세션을 찾아 붙이고, 없으면 새로 만든다. 같은 세션을 동시에 만들려 해도 한 개만 생긴다.
2. WHEN `task_complete` 이벤트를 저장하면 THE SYSTEM SHALL `closeSession(sessionId, 'task_done')`을 호출한다.
3. WHEN 사용자가 웹의 "지금 정리하기"를 누르면 THE SYSTEM SHALL `POST /api/sessions/close`로 현재 열린 세션을 `closeSession(sessionId, 'manual')`로 닫는다. (spec 없이 대화로 작업했거나 자동 경로가 실패한 경우의 경로)
4. WHERE 시간이 남으면 THE SYSTEM SHALL 새 이벤트가 오거나 화면을 열 때 직전 이벤트와 20분 이상 차이가 나면 이전 세션을 `idle`로 닫는다. 별도 스케줄러는 만들지 않는다. (선택)
5. WHEN `closeSession`이 호출되면 THE SYSTEM SHALL 세션 상태를 `open`에서 `closing`으로 조건부 갱신해 먼저 잡은 쪽만 카드 생성을 실행하고, 이미 닫힌 세션이면 `skipped: true`를 반환한다.
6. WHEN 카드 생성이 끝나면 THE SYSTEM SHALL 마지막으로 처리한 이벤트 위치(`last_processed_event_id`)를 갱신하고, 다음 생성은 그 이후 이벤트만 쓴다.
7. IF 카드 생성이 실패하면 THEN THE SYSTEM SHALL 세션 상태를 되돌려 다시 시도할 수 있게 한다.
8. THE SYSTEM SHALL 세션 닫기와 카드 생성 로직을 `lib/services/`의 함수 두 개(`closeSession`, `generateCards`)로 두고, route는 이를 호출하는 얇은 층으로만 둔다.

## Requirement 3: STAR 트러블슈팅 카드 생성 (be-2)

**User Story:** 사용자로서, 쌓인 기록에서 문제와 해결이 STAR 구조의 카드로 정리되길 원한다. 그래야 면접과 자소서에서 바로 쓸 수 있다.

### Acceptance Criteria
1. WHEN 세션이 닫히면 THE SYSTEM SHALL 세션의 이벤트와 spec 내용을 한 번에 LLM에 보내 카드를 JSON으로 받는다. (세션당 0~3개)
2. THE SYSTEM SHALL 카드에 제목, 상황, 문제, 해결, 결과, 태그, 근거 이벤트 id를 담는다.
3. WHERE 세션에 사용자 프롬프트(`prompt`)가 있으면 THE SYSTEM SHALL 사용자의 지시와 방향 결정을 에이전트의 실행과 구분해 담는다. 프롬프트가 없으면 "확인 필요"로 둔다. (카드 형식은 PM과 확인)
4. THE SYSTEM SHALL 수치와 결과처럼 로그에 근거가 없는 내용을 지어내지 않고 "확인 필요"로 표시한다.
5. THE SYSTEM SHALL 오타, import 누락 같은 사소한 수정은 카드로 만들지 않는다.
6. WHEN 같은 세션에서 `shell`이 실패(종료 코드가 0이 아님)한 뒤 성공한 흐름이 있으면 THE SYSTEM SHALL 그것을 트러블슈팅 후보로 우선한다. 사용자 프롬프트가 적어도 셸 결과와 spec 내용만으로 카드를 만들 수 있어야 한다.
7. WHEN 카드로 만들 트러블슈팅이 없으면 THE SYSTEM SHALL 카드를 만들지 않는다.
8. THE SYSTEM SHALL LLM 호출을 서버에서만 하고, LLM에 보내기 직전에 같은 패턴으로 한 번 더 마스킹한다. API 키는 `.env.local`에 두고 `NEXT_PUBLIC_`을 붙이지 않는다.
9. IF LLM 응답이 JSON이 아니거나 호출이 실패하면 THEN THE SYSTEM SHALL 오류를 그대로 알리고 다시 시도할 수 있게 한다. 손으로 만든 카드로 대체하지 않는다.

## Requirement 4: 카드 타임라인과 확인 필요 입력 (fe, 카드 API는 be-2)

**User Story:** 사용자로서, 카드를 시간순으로 보고 비어 있는 부분을 직접 채우고 싶다. 그래야 거짓 없이 내 이력으로 쓸 수 있다.

### Acceptance Criteria
1. THE SYSTEM SHALL `GET /api/cards`로 카드 목록을 주고, 화면(`app/page.tsx`)은 시간순으로 보여 주며 출처 도구(source)를 배지로 표시한다.
2. WHEN 사용자가 카드를 열면 THE SYSTEM SHALL `GET /api/cards/[id]`로 상세(각 항목과 근거 이벤트)를 보여 준다.
3. WHEN 카드에 "확인 필요" 칸이 있으면 THE SYSTEM SHALL 사용자가 입력해 `PATCH /api/cards/[id]`로 저장할 수 있게 한다.
4. THE SYSTEM SHALL 화면에 "지금 정리하기" 버튼을 둔다.
5. IF API가 실패하면 THEN THE SYSTEM SHALL 오류를 그대로 표시한다. `mock-data.ts`로 대체하지 않는다.
6. THE SYSTEM SHALL 목록과 상세(와 내보내기) 화면만 만들고 노션 스타일 보드는 만들지 않는다.

## Requirement 5: 포트폴리오 내보내기 (be-2 API, fe 화면)

**User Story:** 사용자로서, 카드를 골라 버튼 한 번으로 포트폴리오 문서로 바꾸고 싶다. 그래야 지원할 때 다시 정리하지 않아도 된다.

### Acceptance Criteria
1. WHEN 사용자가 카드를 고르고 형식을 선택하면 THE SYSTEM SHALL `POST /api/export`로 변환한다.
2. WHERE 형식이 README이면 THE SYSTEM SHALL GitHub README의 트러블슈팅 섹션(마크다운)을 만든다. (포트폴리오의 중심 결과물)
3. WHERE 형식이 이력서이면 THE SYSTEM SHALL 카드마다 한 줄 요약 문장을 만든다.
4. WHERE 형식이 자소서이면 THE SYSTEM SHALL 입력한 문항과 글자 수에 맞춘 초안을 만든다. (시간이 남으면)
5. THE SYSTEM SHALL 결과를 복사 버튼으로 복사할 수 있게 하고, "확인 필요"로 남은 부분을 그대로 표시한다.

## Requirement 6: 데모와 대비 (PM 주도, 전원)

**User Story:** 팀으로서, 심사에서 끝까지 동작하는 데모를 보여 주고 싶다. 그래야 작동과 사용자 가치 점수를 받을 수 있다.

### 데모 흐름
1. 별도의 데모용 저장소에서 `scripts/install.sh`를 실행해 hook을 설치하는 장면부터 시작한다.
2. 데모용 저장소에는 spec(요구사항, 설계, 태스크)과 **실패하는 테스트**가 미리 있다.
3. spec 태스크 하나를 실행한다. 테스트가 실패했다가 수정되어 통과한다.
4. (권장) 실패했을 때 사용자가 채팅으로 수정 방향을 한 번 지시한다. 이 프롬프트가 카드에서 사용자의 판단이 된다.
5. 태스크가 끝나면(또는 "지금 정리하기") 세션이 닫히고 카드가 자동 생성된다.
6. 웹 화면에서 카드를 확인하고 README 섹션(과 자소서 초안)을 내보낸다.

### Acceptance Criteria
1. THE SYSTEM SHALL 위 흐름을 실제 파이프라인으로 끝까지 실행할 수 있다.
2. WHEN 데모 전이면 THE SYSTEM SHALL 사전 체크리스트로 확인한다: 데모용 저장소 폴더를 직접 열었다 / 워크스페이스를 Trust 했다 / hook 파일을 넣은 뒤 창을 다시 로드하고 새 채팅을 열었다 / 서비스 서버(`npm run dev`)가 켜져 있다 / 프롬프트 하나를 보내 이벤트가 도착하는지 확인했다.
3. THE SYSTEM SHALL 리허설에서 실제 파이프라인으로 생성한 카드만 데모에 쓰고, `seed/export-demo-cards.mjs`로 `seed/demo-cards.json`에 내보내 `seed/restore-demo-cards.mjs`로 복원할 수 있다. 손으로 만든 카드와 `mock-data.ts`는 데모 화면에 쓰지 않는다.
4. THE SYSTEM SHALL 같은 흐름의 백업 영상을 녹화해 둔다.
5. WHEN 자동 경로(태스크 완료)가 실패하면 THE SYSTEM SHALL "지금 정리하기"로 같은 결과를 만들 수 있다.

## 일정 (마감 18:00 기준)

| 시각 | 목표 |
|---|---|
| 지금 ~ 16:00 | 이벤트 저장 → 세션 닫기 → 카드 생성 → 화면 표시가 한 줄로 이어짐 |
| ~ 17:00 | 내보내기, 실제 LLM 품질 다듬기. **17:00 기능 동결** |
| 17:00 ~ 17:40 | 리허설, 실제 파이프라인으로 카드 저장(seed), 백업 영상 |
| 17:40 ~ 18:00 | 제출 |
