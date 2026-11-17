import { q } from "@/lib/db";
import { adminGuard } from "@/lib/auth";
import { createUser, reissueQr, setPin } from "@/lib/attendance/users";

const PIN_ERR = "비밀번호는 4~40자입니다.";
const validPin = (pin: unknown): pin is string => typeof pin === "string" && pin.length >= 4 && pin.length <= 40;
const bad = (error: string) => Response.json({ error }, { status: 400 });

/** 사용자 등록. 이름이 로그인 ID(uid), PIN 이 비밀번호. 동명이인은 이름1, 이름2 … */
export async function POST(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { name, pin } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim() || name.length > 40) return bad("이름을 입력해 주세요.");
  if (!validPin(pin)) return bad(PIN_ERR);
  return Response.json(await createUser(q, name.trim(), pin));
}

/** { id, action: 'reissue' } → QR 재발급, { id, action: 'pin', pin } → 비밀번호 변경 */
export async function PATCH(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id, action, pin } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return bad("잘못된 요청입니다.");
  if (action === "pin") {
    if (!validPin(pin)) return bad(PIN_ERR);
    return (await setPin(q, id, pin)) ? Response.json({ ok: true }) : bad("사용자를 찾을 수 없습니다.");
  }
  if (action !== "reissue") return bad("잘못된 요청입니다.");
  return (await reissueQr(q, id)) ? Response.json({ ok: true }) : bad("사용자를 찾을 수 없습니다.");
}

export async function DELETE(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("id 가 필요합니다.");
  await q(`delete from users where id = $1`, [id]);
  return Response.json({ ok: true });
}
