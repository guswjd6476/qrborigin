import { q } from "@/lib/db";
import { adminGuard } from "@/lib/auth";
import { todayKst } from "@/lib/dates";
import { looksLikeQr, qrHash } from "@/lib/qr/token";

/**
 * 현장 노트북(관리자 로그인 필요)에서 QR 을 보내면 오늘 진행 중인 모든 회차에 출석을 기록한다.
 * 성공은 DB insert 가 실제로 행을 돌려준 뒤에만 응답한다. 중복은 unique(user_id, session_id) 로 막힌다.
 */
export async function POST(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { token } = await req.json().catch(() => ({}));
  if (!looksLikeQr(token)) return Response.json({ result: "invalid" });

  const [u] = await q(`select id, name from users where qr_token_hash = $1`, [qrHash(token)]);
  if (!u) return Response.json({ result: "invalid" });

  const today = todayKst();
  const inserted = await q(
    `insert into attendance (user_id, program_id, session_id, attendance_date)
     select $1, s.program_id, s.id, s.session_date from program_sessions s
     where s.session_date = $2 and s.status = 'scheduled'
     on conflict (user_id, session_id) do nothing
     returning checked_in_at`,
    [u.id, today],
  );
  if (!inserted.length) {
    const [prev] = await q(
      `select checked_in_at from attendance where user_id = $1 and attendance_date = $2 order by checked_in_at limit 1`,
      [u.id, today],
    );
    return Response.json(prev ? { result: "duplicate", name: u.name, checkedInAt: prev.checked_in_at } : { result: "no_session", name: u.name });
  }
  const [{ total }] = await q(`select count(distinct attendance_date)::int total from attendance where user_id = $1`, [u.id]);
  return Response.json({ result: "success", name: u.name, checkedInAt: inserted[0].checked_in_at, total });
}
