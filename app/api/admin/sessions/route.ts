import { q } from "@/lib/db";
import { adminGuard } from "@/lib/auth";
import { isDateStr } from "@/lib/dates";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const isUnique = (e: unknown) => (e as { code?: string })?.code === "23505";
const DUP = "그 날짜에는 이미 이 프로그램의 회차가 있습니다.";

/** 회차 추가 (보강·일정 추가) */
export async function POST(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  if (typeof b.program_id !== "string" || !isDateStr(b.session_date)) return bad("날짜를 확인해 주세요.");
  try {
    await q(`insert into program_sessions (program_id, session_date, session_name) values ($1, $2, $3)`, [
      b.program_id,
      b.session_date,
      String(b.session_name ?? "").slice(0, 60),
    ]);
  } catch (e) {
    if (isUnique(e)) return bad(DUP, 409);
    throw e;
  }
  return Response.json({ ok: true });
}

/** 날짜 변경 / 이름 변경 / 휴강(cancelled)·재개(scheduled) */
export async function PATCH(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== "string") return bad("id 가 필요합니다.");
  if (b.session_date !== undefined && !isDateStr(b.session_date)) return bad("날짜를 확인해 주세요.");
  if (b.status !== undefined && !["scheduled", "cancelled"].includes(b.status)) return bad("상태를 확인해 주세요.");
  try {
    // 회차 날짜를 옮기면 그 회차 출석 기록의 날짜도 같은 문장 안에서 따라간다
    await q(
      `with s as (
         update program_sessions set session_date = coalesce($2::date, session_date), session_name = coalesce($3, session_name), status = coalesce($4, status)
         where id = $1 returning id, session_date
       )
       update attendance a set attendance_date = s.session_date from s where a.session_id = s.id`,
      [b.id, b.session_date ?? null, typeof b.session_name === "string" ? b.session_name.slice(0, 60) : null, b.status ?? null],
    );
  } catch (e) {
    if (isUnique(e)) return bad(DUP, 409);
    throw e;
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("id 가 필요합니다.");
  await q(`delete from program_sessions where id = $1`, [id]);
  return Response.json({ ok: true });
}
