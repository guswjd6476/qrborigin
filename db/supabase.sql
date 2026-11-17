-- Supabase 에서만 실행: RLS 와 Realtime 설정 (schema.sql 다음에 실행)
-- 서버는 DATABASE_URL(postgres 역할)로 접속하므로 RLS 를 거치지 않는다.
-- 휴대폰은 서버가 발급한 JWT(sub = users.id, role = authenticated)로 Realtime 만 구독한다.

alter table users enable row level security;            -- 정책 없음: 클라이언트는 직접 못 읽는다
alter table programs enable row level security;
alter table program_sessions enable row level security;
alter table attendance enable row level security;

drop policy if exists programs_read on programs;
create policy programs_read on programs for select to authenticated using (true);

drop policy if exists sessions_read on program_sessions;
create policy sessions_read on program_sessions for select to authenticated using (true);

drop policy if exists attendance_own on attendance;
create policy attendance_own on attendance for select to authenticated using (user_id = auth.uid());

-- Realtime: attendance 변경을 방송 (RLS 때문에 본인 행만 전달된다)
do $$ begin
  alter publication supabase_realtime add table attendance;
exception when duplicate_object then null;
end $$;
