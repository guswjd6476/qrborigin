import { q } from "@/lib/db";
import { adminGuard } from "@/lib/auth";
import { isDateStr } from "@/lib/dates";
import { createProgram } from "@/lib/attendance/programs";

const bad = (error: string) => Response.json({ error }, { status: 400 });
const goalOk = (g: unknown): g is number => Number.isInteger(g) && (g as number) >= 1 && (g as number) <= 7;

export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  const programs = await q(`select * from programs order by start_date desc`);
  const sessions = await q(
    `select s.*, (select count(*)::int from attendance a where a.session_id = s.id) checkins
     from program_sessions s order by s.session_date`,
  );
  return Response.json({ programs: programs.map((p) => ({ ...p, sessions: sessions.filter((s) => s.program_id === p.id) })) });
}

export async function POST(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  const name = typeof b.program_name === "string" ? b.program_name.trim() : "";
  if (!name || name.length > 80) return bad("프로그램명을 입력해 주세요.");
  if (!isDateStr(b.start_date) || !isDateStr(b.end_date) || b.end_date < b.start_date) return bad("기간을 확인해 주세요.");
  if (!goalOk(b.weekly_attendance_goal)) return bad("주간 출석 목표는 1~7회입니다.");
  const days = Array.isArray(b.days_of_week) ? [...new Set<unknown>(b.days_of_week)].filter((d): d is number => goalOk(d)) : []; // 요일도 1~7
  if (!days.length) return bad("진행 요일을 하나 이상 골라 주세요.");
  const r = await createProgram(q, { program_name: name, start_date: b.start_date, end_date: b.end_date, weekly_attendance_goal: b.weekly_attendance_goal, days_of_week: days });
  return Response.json(r);
}

/** 이름·주간 목표 변경 */
export async function PATCH(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== "string") return bad("id 가 필요합니다.");
  const name = typeof b.program_name === "string" ? b.program_name.trim() : null;
  if (name !== null && (!name || name.length > 80)) return bad("프로그램명을 확인해 주세요.");
  if (b.weekly_attendance_goal !== undefined && !goalOk(b.weekly_attendance_goal)) return bad("주간 출석 목표는 1~7회입니다.");
  await q(
    `update programs set program_name = coalesce($2, program_name), weekly_attendance_goal = coalesce($3, weekly_attendance_goal) where id = $1`,
    [b.id, name, b.weekly_attendance_goal ?? null],
  );
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("id 가 필요합니다.");
  await q(`delete from programs where id = $1`, [id]);
  return Response.json({ ok: true });
}
