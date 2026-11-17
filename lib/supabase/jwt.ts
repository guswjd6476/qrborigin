import crypto from "node:crypto";

export type RealtimeConfig = { url: string; anonKey: string; token: string };

/**
 * 휴대폰이 Supabase Realtime 을 구독할 때 쓰는 JWT.
 * sub = users.id 라서 RLS(attendance.user_id = auth.uid())로 본인 출석 변경만 받는다.
 * Supabase 연결 정보가 없으면 null → 클라이언트는 폴링으로 대신한다(데모 모드).
 */
export function realtimeConfig(userId: string): RealtimeConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!url || !anonKey || !jwtSecret) return null;
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = enc({ alg: "HS256", typ: "JWT" });
  const body = enc({ sub: userId, role: "authenticated", aud: "authenticated", iat: now, exp: now + 6 * 3600 });
  const sig = crypto.createHmac("sha256", jwtSecret).update(`${head}.${body}`).digest("base64url");
  return { url, anonKey, token: `${head}.${body}.${sig}` };
}
