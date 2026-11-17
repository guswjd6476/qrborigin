import type { Runner } from "./db";
import { addDays, todayKst } from "./dates";
import { createProgram } from "./attendance/programs";
import { upsertUser } from "./attendance/users";

export const DEMO_USERS = [
  { uid: "김하늘", name: "김하늘", pin: "1234" },
  { uid: "이바다", name: "이바다", pin: "2345" },
  { uid: "박초록", name: "박초록", pin: "3456" },
];

/** 데모 데이터: 오늘 기준 앞뒤 6주 프로그램(월·수·금) + 오늘 회차 + 지난 출석 일부 + 휴강 1회 */
export async function seedDemo(run: Runner) {
  const today = todayKst();
  const ids: string[] = [];
  for (const u of DEMO_USERS) ids.push(await upsertUser(run, u.uid, u.name, u.pin));
  const { id: programId } = await createProgram(run, {
    program_name: "불안구독해지센터 시즌 프로그램",
    start_date: addDays(today, -42),
    end_date: addDays(today, 42),
    weekly_attendance_goal: 3,
    days_of_week: [1, 3, 5],
  });
  // 현장 테스트가 되도록 오늘도 회차가 있게 한다
  await run(
    `insert into program_sessions (program_id, session_date, session_name) values ($1, $2, '특별 회차') on conflict do nothing`,
    [programId, today],
  );
  await run(
    `update program_sessions set status = 'cancelled' where id = (
       select id from program_sessions where session_date < $1 order by session_date desc offset 2 limit 1)`,
    [today],
  );
  // 첫 번째 사용자는 지난 회차 대부분 출석, 두 번째는 절반
  const plan: [number, number][] = [[0, 4], [1, 2]];
  for (const [i, every] of plan) {
    await run(
      `insert into attendance (user_id, program_id, session_id, attendance_date, checked_in_at)
       select $1, program_id, id, session_date, (session_date + time '19:00' + random() * interval '20 minutes') at time zone 'Asia/Seoul'
       from (select *, row_number() over (order by session_date) rn
             from program_sessions where session_date < $2 and status = 'scheduled') s
       where rn % $3 <> 0`,
      [ids[i], today, every],
    );
  }
}
