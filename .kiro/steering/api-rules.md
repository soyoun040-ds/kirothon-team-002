---
inclusion: fileMatch
fileMatchPattern: "app/api/**/*.ts"
---

# API 작성 규칙 (app/api 파일을 다룰 때만 적용)

- 응답은 항상 JSON. 성공: `{ data: ... }`, 실패: `{ error: "사람이 읽을 수 있는 메시지" }`
- 실패 시 알맞은 HTTP 상태 코드를 쓴다 (400 잘못된 요청, 401 로그인 필요, 500 서버 오류).
- 요청 값은 사용하기 전에 비어 있는지 확인한다.
- DB 접근은 `lib/supabase.ts`의 클라이언트를 사용한다.
- 비밀 키는 `process.env`로만 읽는다.
