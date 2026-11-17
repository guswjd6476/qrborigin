import { randomUUID } from "node:crypto";
import type { Runner } from "../db";
import { hashPin } from "../crypto";
import { qrHash, qrToken } from "../qr/token";

/** UID 가 있으면 이름·PIN 을 바꾸고(잠금 해제), 없으면 새로 만든다. QR 은 그대로 둔다. */
export async function upsertUser(run: Runner, uid: string, name: string, pin: string) {
  const id = randomUUID();
  const [row] = await run(
    `insert into users (id, uid, name, pin_hash, qr_token_hash) values ($1, $2, $3, $4, $5)
     on conflict (uid) do update set name = excluded.name, pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null
     returning id`,
    [id, uid, name, hashPin(pin), qrHash(qrToken(id, 1))],
  );
  return row.id as string;
}

/** 새 사용자. 같은 이름이 있으면 이름1, 이름2 … 중 비어 있는 첫 ID 를 쓴다 */
export async function createUser(run: Runner, name: string, pin: string) {
  const id = randomUUID();
  const hash = hashPin(pin);
  for (let n = 0; ; n++) {
    const uid = n ? `${name}${n}` : name;
    const [row] = await run(
      `insert into users (id, uid, name, pin_hash, qr_token_hash) values ($1, $2, $3, $4, $5) on conflict (uid) do nothing returning uid`,
      [id, uid, name, hash, qrHash(qrToken(id, 1))],
    );
    if (row) return { id, uid: row.uid as string };
  }
}

/** 비밀번호 변경(잠금 해제) */
export async function setPin(run: Runner, userId: string, pin: string) {
  const rows = await run(`update users set pin_hash = $2, failed_attempts = 0, locked_until = null where id = $1 returning id`, [userId, hashPin(pin)]);
  return rows.length > 0;
}

/** 이전 QR 을 폐기하고 새 QR 토큰을 발급한다 */
export async function reissueQr(run: Runner, userId: string) {
  const [u] = await run(`select qr_token_version from users where id = $1`, [userId]);
  if (!u) return null;
  const v = u.qr_token_version + 1;
  await run(`update users set qr_token_version = $2, qr_token_hash = $3 where id = $1`, [userId, v, qrHash(qrToken(userId, v))]);
  return qrToken(userId, v);
}
