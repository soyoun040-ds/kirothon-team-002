# be-1 설계 메모

## 세션 매칭 (POST /api/events)

1. `(source, project_name, session_id)`로 `status='open'`인 세션을 찾는다.
2. 없으면 새로 만든다.
3. 동시에 여러 hook이 실행되면 insert에서 unique 위반(23505)이 난다. 오류로 끝내지 않고 다시 조회해서 기존 열린 세션에 붙인다.
4. `closing`, `closed` 세션에는 붙이지 않는다. 같은 ID로 이벤트가 오면 새 세션이 생긴다.

## 이벤트 정렬

도착 순서가 아니라 `collected_at`, 같으면 `id` 순이다. (`ORDER BY collected_at, id`)

## commit 이벤트 (아직 구현하지 않음)

- `source`는 `"git"`. 타입만 `types/event.ts`에 열어 두었다.
- 구현 시 규칙(나중에 post-commit 만들 때 적용): git은 도구 세션 ID를 모르므로,
  같은 `project_name`에서 `status='open'`인 가장 최근 세션(`created_at` 기준 최신)에 붙인다.
  열린 세션이 없으면 `source='git'` 세션을 새로 만들지, 버릴지는 그때 정한다.
- 현재 route는 이 규칙을 구현하지 않는다. `source='git'` 이벤트도 일반 이벤트처럼 `session_id`로 매칭한다.
