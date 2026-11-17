import { q } from "@/lib/db";
import { isDemo } from "@/lib/env";
import { adminGuard } from "@/lib/auth";
import { isDateStr, todayKst } from "@/lib/dates";

/** ?date=YYYY-MM-DD&q=검색어&user=사용자id */
export async function GET(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const today = todayKst();
  const date = isDateStr(sp.get("date")) ? sp.get("date")! : today;
  const search = (sp.get("q") ?? "").trim().slice(0, 40);
  const userId = sp.get("user");
  const match = `($2 = '' or u.name ilike '%' || $2 || '%' or u.uid ilike '%' || $2 || '%')`;

  const [{ users }] = await q(`select count(*)::int users from users`);
  const sessions = await q(
    `select s.id, s.session_name, s.status, p.program_name from program_sessions s join programs p on p.id = s.program_id
     where s.session_date = $1 order by p.program_name`,
    [date],
  );
  const [{ present }] = await q(`select count(distinct user_id)::int present from attendance where attendance_date = $1`, [date]);
  const hasSession = sessions.some((s) => s.status === "scheduled");

  // 그날 진행 회차 × 전체 사용자 → 출석 여부
  const rows = await q(
    `select u.id user_id, u.name, u.uid, p.program_name, s.session_name, s.session_date, a.checked_in_at, (a.id is not null) present
     from program_sessions s
     join programs p on p.id = s.program_id
     cross join users u
     left join attendance a on a.session_id = s.id and a.user_id = u.id
     where s.session_date = $1 and s.status = 'scheduled' and ${match}
     order by present desc, a.checked_in_at, u.name`,
    [date, search],
  );
  const people = await q(
    `select u.id, u.uid, u.name, u.created_at, count(distinct a.attendance_date)::int days, max(a.checked_in_at) last_check_in
     from users u left join attendance a on a.user_id = u.id
     where ${match.replaceAll("$2", "$1")}
     group by u.id order by u.name`,
    [search],
  );
  const programs = await q(
    `select p.id, p.program_name, p.start_date, p.end_date, p.weekly_attendance_goal,
            count(distinct s.id) filter (where s.status = 'scheduled' and s.session_date <= $1)::int held,
            count(a.id)::int checkins
     from programs p
     left join program_sessions s on s.program_id = p.id
     left join attendance a on a.session_id = s.id
     group by p.id order by p.start_date desc`,
    [today],
  );
  const history = userId
    ? await q(
        `select a.attendance_date, a.checked_in_at, p.program_name, s.session_name
         from attendance a join program_sessions s on s.id = a.session_id join programs p on p.id = a.program_id
         where a.user_id = $1 order by a.checked_in_at desc`,
        [userId],
      )
    : null;

  return Response.json({
    demo: isDemo,
    date,
    today,
    stats: {
      users,
      present,
      absent: hasSession ? Math.max(users - present, 0) : 0,
      rate: hasSession && users ? Math.round((present / users) * 100) : null,
    },
    sessions,
    rows,
    people,
    programs: programs.map((p) => ({ ...p, rate: p.held && users ? Math.round((p.checkins / (p.held * users)) * 100) : null })),
    history,
  });
}
