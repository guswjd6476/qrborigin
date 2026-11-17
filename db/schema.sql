-- 불안구독해지센터 출석 핵심 스키마 (Supabase Postgres 와 로컬 데모용 PGlite 가 같이 쓴다)

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,
  name text not null,
  pin_hash text not null,                      -- 본인 인증용 PIN (scrypt)
  qr_token_version int not null default 1,     -- 올리면 이전 QR 은 폐기된다
  qr_token_hash text unique,                   -- QR 토큰의 sha256, 원문은 저장하지 않는다
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  program_name text not null,
  start_date date not null,
  end_date date not null,
  weekly_attendance_goal int not null default 3 check (weekly_attendance_goal between 1 and 7),
  days_of_week int[] not null default '{1,3,5}', -- ISO 요일 1=월 … 7=일, 회차 자동 생성에만 쓴다
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  session_date date not null,
  session_name text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (program_id, session_date)
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  session_id uuid not null references program_sessions(id) on delete cascade,
  attendance_date date not null,
  checked_in_at timestamptz not null default now(),
  status text not null default 'present',
  unique (user_id, session_id)                 -- 중복 출석은 DB 에서도 막는다
);

create index if not exists attendance_user_date on attendance (user_id, attendance_date);
create index if not exists attendance_date_idx on attendance (attendance_date);
create index if not exists sessions_date_idx on program_sessions (session_date);
