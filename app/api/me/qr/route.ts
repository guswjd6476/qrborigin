import { q } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { qrToken } from "@/lib/qr/token";
import { reissueQr } from "@/lib/attendance/users";

const unauth = () => Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

/** 본인 인증된 사용자에게만 본인 QR 토큰을 돌려준다 */
export async function GET() {
  const id = await currentUserId();
  const [u] = id ? await q(`select id, uid, name, qr_token_version from users where id = $1`, [id]) : [];
  if (!u) return unauth();
  return Response.json({ uid: u.uid, name: u.name, qr: qrToken(u.id, u.qr_token_version) }, { headers: { "Cache-Control": "no-store" } });
}

/** 분실·유출 시 재발급: 이전 QR 은 즉시 무효 */
export async function POST() {
  const id = await currentUserId();
  const qr = id ? await reissueQr(q, id) : null;
  return qr ? Response.json({ qr }) : unauth();
}
