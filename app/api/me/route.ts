import { q } from "@/lib/db";
import { isDemo } from "@/lib/env";
import { currentUserId } from "@/lib/auth";
import { todayKst } from "@/lib/dates";
import { summarize, type AttendanceRecord, type Session } from "@/lib/attendance/summary";
import { realtimeConfig } from "@/lib/supabase/jwt";

/** 마이페이지 데이터: 일정 전체 + 본인 출석 + 통계 + Realtime 구독용 토큰 */
export async function GET() {
  const id = await currentUserId();
  const [user] = id ? await q(`select id, uid, name from users where id = $1`, [id]) : [];
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sessions = await q<Session>(
    `select s.id, s.program_id, p.program_name, s.session_date, s.session_name, s.status,
            p.weekly_attendance_goal, p.start_date, p.end_date
     from program_sessions s join programs p on p.id = s.program_id
     order by s.session_date, p.program_name`,
  );
  const records = await q<AttendanceRecord>(
    `select id, session_id, program_id, attendance_date, checked_in_at from attendance where user_id = $1 order by checked_in_at`,
    [id],
  );
  const today = todayKst();
  return Response.json(
    { user, today, sessions, records, summary: summarize(sessions, records, today), realtime: realtimeConfig(user.id), demo: isDemo },
    { headers: { "Cache-Control": "no-store" } },
  );
}
