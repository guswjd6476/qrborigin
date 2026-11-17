import { hmac, sha256 } from "../crypto";

export const QR_PREFIX = "BORIGIN1:";

/** QR 에는 UID 대신 HMAC 토큰만 담는다. 같은 버전이면 다시 접속해도 같은 QR, 버전을 올리면 재발급(이전 QR 폐기). */
export const qrToken = (userId: string, version: number) => QR_PREFIX + hmac(`qr:${userId}:${version}`);
export const qrHash = (token: string) => sha256(token);
export const looksLikeQr = (s: unknown): s is string => typeof s === "string" && s.startsWith(QR_PREFIX) && s.length < 100;
