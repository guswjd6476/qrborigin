import crypto from "node:crypto";
import { isDemo } from "./env";

export function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (isDemo) return "demo-only-secret-do-not-use-in-production";
  throw new Error("SESSION_SECRET 환경변수가 필요합니다.");
}

export const hmac = (data: string, key = secret()) => crypto.createHmac("sha256", key).update(data).digest("base64url");
export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** 길이가 달라도 시간 차이 없이 비교 */
export function safeEqual(a: string, b: string) {
  return crypto.timingSafeEqual(Buffer.from(sha256(a)), Buffer.from(sha256(b)));
}

/** 서명된 세션 토큰: base64url(payload).hmac */
export function signToken(payload: object, ttlSec: number) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyToken<T>(token: string | undefined): (T & { exp: number }) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
}

export function hashPin(pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(pin, salt, 32).toString("hex")}`;
}

export function checkPin(pin: string, stored: string) {
  const [salt, h] = stored.split(":");
  if (!salt || !h) return false;
  return crypto.timingSafeEqual(crypto.scryptSync(pin, salt, 32), Buffer.from(h, "hex"));
}
