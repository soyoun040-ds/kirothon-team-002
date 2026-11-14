# Implementation Plan

- [ ] 1. 실패하는 시간대 테스트 확인
  - `npm test`를 실행해 KST 자정 근처, 타 시간대 자정 근처 테스트가 실패하는지 확인한다.
  - _Requirements: 1.2, 1.3_

- [ ] 2. 시간대 기준 날짜 저장 구현 및 테스트 통과
  - 먼저 `npm test`를 그대로(파이프 없이) 실행해 실패하는 테스트를 확인한다.
  - `src/schedule.ts`의 `saveSchedule`이 `input.timeZone` 기준 날짜(`YYYY-MM-DD`)를 계산하도록 수정한다.
  - `npm test`의 3개 테스트가 모두 통과해야 한다.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. 경계 케이스 테스트 보강
  - 잘못된 `timeZone` 값을 넘겼을 때의 동작을 정하고 테스트를 추가한다.
  - _Requirements: 1.1_
