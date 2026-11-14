# Requirements Document

## Introduction

일정 저장 시 날짜가 UTC 기준으로 잘려, 한국 시간 자정 근처 일정이 전날로 저장되는 문제가 있다. 사용자의 시간대 기준으로 일정 날짜를 저장하도록 `saveSchedule`을 수정한다.

## Requirements

### Requirement 1: 사용자의 시간대 기준으로 일정 날짜를 저장한다

**User Story:** 사용자로서, 내가 속한 시간대의 달력 날짜로 일정이 저장되길 원한다. 그래야 자정 근처 일정도 내가 입력한 날짜에 표시된다.

#### Acceptance Criteria

1. WHEN 사용자가 일정을 저장하면 THEN `saveSchedule` SHALL 입력된 `timeZone` 기준의 달력 날짜(`YYYY-MM-DD`)를 `date`로 반환한다.
2. WHEN `Asia/Seoul` 사용자가 2026-11-20 00:30 KST 일정을 저장하면 THEN `date` SHALL `"2026-11-20"`이다.
3. WHEN `America/Los_Angeles` 사용자가 2026-11-20 23:30 PST 일정을 저장하면 THEN `date` SHALL `"2026-11-20"`이다.
4. WHEN 일정이 낮 시간대이면 THEN `date` SHALL 기존과 동일하게 유지된다.
5. IF 실행 환경의 로컬 시간대가 달라져도 THEN 결과 `date` SHALL 변하지 않는다.
