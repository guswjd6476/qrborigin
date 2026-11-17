import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_TTL, adminPassword, adminToken, cookieOpts } from "@/lib/auth";
import { safeEqual } from "@/lib/crypto";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const expected = adminPassword();
  if (!expected) return NextResponse.json({ error: "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다." }, { status: 503 });
  if (typeof password !== "string" || !safeEqual(password, expected))
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), cookieOpts(ADMIN_TTL));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", cookieOpts(0));
  return res;
}
