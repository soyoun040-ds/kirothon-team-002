# Design Document

## Overview

`src/schedule.ts`의 `saveSchedule`이 `toISOString().slice(0, 10)`으로 UTC 날짜를 사용하는 것을, 입력된 IANA 시간대 기준의 날짜 계산으로 바꾼다.

## Approach

- `Intl.DateTimeFormat`에 `timeZone` 옵션을 주어 해당 시간대의 연/월/일을 구한다. (예: `en-CA` 로캘은 `YYYY-MM-DD` 형식을 반환한다.)
- 외부 날짜 라이브러리는 추가하지 않는다.
- `ScheduleInput`, `SavedSchedule` 인터페이스는 변경하지 않는다.

## Testing

`test/schedule.test.ts`의 기존 3개 테스트(KST 낮 시간, KST 자정 근처, 타 시간대 자정 근처)가 모두 통과해야 한다. 테스트는 오프셋이 포함된 ISO 문자열로 `Date`를 만들기 때문에 실행 머신의 시간대에 의존하지 않는다.
