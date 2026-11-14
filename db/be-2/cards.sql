-- be-2: cards 테이블. db/be-1/events.sql을 먼저 실행한 뒤 Supabase SQL Editor에서 실행한다.
-- 공통 테이블 스키마이므로 변경 시 전원 합의 필요.

create table if not exists cards (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references sessions(id),
  source             text not null,                     -- 출처 배지: kiro | claude-code | cursor | git
  project_name       text not null,
  title              text not null,
  situation          text not null,                     -- S: 상황
  task               text not null,                     -- T: 과제
  action             text not null,                     -- A: 행동
  result             text not null,                     -- R: 결과 (근거가 없으면 '확인 필요')
  needs_check        jsonb not null default '[]'::jsonb, -- '확인 필요' 칸 이름 목록. 예: ["result"]
  evidence_event_ids bigint[] not null default '{}',    -- 근거가 된 events.id
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 카드 목록은 시간순으로 보여 준다.
create index if not exists cards_created_idx on cards (created_at desc);
create index if not exists cards_session_idx on cards (session_id);

-- 데모 한정으로 RLS를 끈다. (이유는 db/be-1/events.sql 참고)
alter table cards disable row level security;
