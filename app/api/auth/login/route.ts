import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { checkPin } from "@/lib/crypto";
import { USER_COOKIE, USER_TTL, cookieOpts, userToken } from "@/lib/auth";

const MAX_FAIL = 5;
const WRONG = { error: "이름 또는 비밀번호가 올바르지 않습니다." };

/** 이름(uid) + 비밀번호(pin) 본인 인증. 5회 틀리면 10분 잠금. */
export async function POST(req: Request) {
  const { uid, pin } = await req.json().catch(() => ({}));
  if (typeof uid !== "string" || typeof pin !== "string" || !uid.trim() || !pin || pin.length > 40)
    return NextResponse.json({ error: "이름과 비밀번호를 입력해 주세요." }, { status: 400 });

  const [u] = await q(`select id, pin_hash, locked_until from users where uid = $1`, [uid.trim()]);
  if (!u) return NextResponse.json(WRONG, { status: 401 });
  if (u.locked_until && new Date(u.locked_until) > new Date())
    return NextResponse.json({ error: "여러 번 틀려 잠시 잠겼습니다. 10분 뒤 다시 시도해 주세요." }, { status: 423 });

  if (!checkPin(pin, u.pin_hash)) {
    await q(
      `update users set
         failed_attempts = case when failed_attempts + 1 >= $2 then 0 else failed_attempts + 1 end,
         locked_until = case when failed_attempts + 1 >= $2 then now() + interval '10 minutes' else locked_until end
       where id = $1`,
      [u.id, MAX_FAIL],
    );
    return NextResponse.json(WRONG, { status: 401 });
  }
  await q(`update users set failed_attempts = 0, locked_until = null where id = $1`, [u.id]);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE, userToken(u.id), cookieOpts(USER_TTL));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE, "", cookieOpts(0));
  return res;
}
