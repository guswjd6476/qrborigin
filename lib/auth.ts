import { cookies } from "next/headers";
import { isDemo } from "./env";
import { signToken, verifyToken } from "./crypto";

export const USER_COOKIE = "bo_user";
export const ADMIN_COOKIE = "bo_admin";
export const USER_TTL = 60 * 60 * 24 * 30;
export const ADMIN_TTL = 60 * 60 * 24 * 30; // 현장 노트북은 한 번 로그인하면 오래 유지

/** 운영에서는 ADMIN_PASSWORD 가 없으면 관리자 로그인 자체를 막는다 */
export const adminPassword = () => process.env.ADMIN_PASSWORD || (isDemo ? "admin1234" : null);

export const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export const userToken = (id: string) => signToken({ k: "user", id }, USER_TTL);
export const adminToken = () => signToken({ k: "admin" }, ADMIN_TTL);

export async function currentUserId() {
  const p = verifyToken<{ k: string; id: string }>((await cookies()).get(USER_COOKIE)?.value);
  return p?.k === "user" ? p.id : null;
}

export async function isAdmin() {
  const p = verifyToken<{ k: string }>((await cookies()).get(ADMIN_COOKIE)?.value);
  return p?.k === "admin";
}

/** 관리자 API 앞에서: 아니면 401 응답, 맞으면 null */
export async function adminGuard() {
  return (await isAdmin()) ? null : Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
}
