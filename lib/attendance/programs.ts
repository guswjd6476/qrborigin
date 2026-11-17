import type { Runner } from "../db";

export type NewProgram = {
  program_name: string;
  start_date: string;
  end_date: string;
  weekly_attendance_goal: number;
  days_of_week: number[];
};

/** 프로그램과 진행 요일에 맞는 회차를 한 문장(원자적)으로 만든다. 이후 회차는 관리자가 하나씩 수정·추가·휴강 처리. */
export async function createProgram(run: Runner, p: NewProgram) {
  const rows = await run(
    `with p as (
       insert into programs (program_name, start_date, end_date, weekly_attendance_goal, days_of_week)
       values ($1, $2, $3, $4, $5) returning id
     ), s as (
       insert into program_sessions (program_id, session_date, session_name)
       select p.id, d::date, (row_number() over (order by d)) || '회차'
       from p, generate_series($2::date, $3::date, interval '1 day') d
       where extract(isodow from d)::int = any($5::int[])
       returning program_id
     )
     select (select id from p) as id, (select count(*)::int from s) as sessions`,
    [p.program_name, p.start_date, p.end_date, p.weekly_attendance_goal, p.days_of_week],
  );
  return rows[0] as { id: string; sessions: number };
}
