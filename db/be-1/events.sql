-- be-1: sessions / events 테이블. Supabase SQL Editor에서 이 파일 전체를 한 번에 실행한다.
-- 공통 테이블 스키마이므로 변경 시 전원 합의 필요.

-- ===== sessions =====
create table if not exists sessions (
  id                      uuid primary key default gen_random_uuid(),
  source                  text not null,                  -- kiro | claude-code | cursor | git
  project_name            text not null,
  external_id             text not null,                  -- 이벤트의 session_id
  status                  text not null default 'open'
                          check (status in ('open', 'closing', 'closed')),
  last_processed_event_id bigint,                         -- 카드 생성에 이미 쓴 마지막 events.id (be-2)
  reason                  text,                           -- 닫은 이유: task_done | manual | idle | session_end
  created_at              timestamptz not null default now(),
  closed_at               timestamptz
);

-- 같은 (source, project_name, external_id)의 열린 세션은 하나만 허용한다.
-- 닫힌 세션과 'closing' 세션은 제외하므로, 닫은 뒤 같은 ID로 이벤트가 오면 새 세션이 생긴다.
create unique index if not exists sessions_one_open_uq
  on sessions (source, project_name, external_id)
  where status = 'open';

create index if not exists sessions_status_idx on sessions (status, project_name);

-- ===== events =====
create table if not exists events (
  id            bigint generated always as identity primary key,
  session_id    uuid not null references sessions(id),
  source        text not null,
  project_name  text not null,
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,
  collected_at  timestamptz not null,                     -- 클라이언트 수집 시각 (정렬 기준)
  created_at    timestamptz not null default now()        -- 서버 저장 시각 (참고용)
);

-- 이벤트 순서는 도착 순서가 아니라 collected_at, 같으면 id 순이다.
create index if not exists events_session_order_idx
  on events (session_id, collected_at, id);

-- ===== RLS =====
-- 데모 한정으로 RLS를 끈다.
--  - 로그인(Auth)이 없어서 사용자별 정책을 만들 기준이 없다.
--  - route(서버)가 anon key로 직접 읽고 쓴다.
--  - 데모 후 서버 전용 키(service role)로 교체하고 RLS를 다시 켠다.
alter table sessions disable row level security;
alter table events   disable row level security;
