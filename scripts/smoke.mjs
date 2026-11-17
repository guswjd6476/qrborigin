// 최종 시나리오를 API 로 검증한다 (카메라 대신 QR 문자열을 그대로 보낸다).
// 사용: 서버를 데모 모드로 켠 뒤  node scripts/smoke.mjs [http://localhost:3000] [관리자비밀번호]
import assert from "node:assert/strict";

const BASE = process.argv[2] ?? "http://localhost:3000";
const ADMIN_PW = process.argv[3] ?? "admin1234";

function client() {
  let cookie = "";
  return async (path, method = "GET", body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    return { status: res.status, body: await res.json().catch(() => null) };
  };
}

const admin = client();
const phone = client();
const stranger = client();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const uid = "SMOKE-" + Date.now().toString(36);

// 0. 권한: 로그인 없이 체크인·관리자 API 불가
assert.equal((await stranger("/api/check-in", "POST", { token: "x" })).status, 401);
assert.equal((await stranger("/api/admin/dashboard")).status, 401);
assert.equal((await admin("/api/admin/login", "POST", { password: "wrong" })).status, 401);

// 1~2. 관리자 로그인, 프로그램 등록(오늘 포함, 주 3회 목표, 매일 진행)
assert.equal((await admin("/api/admin/login", "POST", { password: ADMIN_PW })).status, 200);
const prog = await admin("/api/admin/programs", "POST", {
  program_name: "스모크 테스트",
  start_date: today,
  end_date: today,
  weekly_attendance_goal: 3,
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
});
assert.equal(prog.status, 200, JSON.stringify(prog.body));
assert.equal(prog.body.sessions, 1);
assert.equal((await admin("/api/admin/users", "POST", { name: uid, pin: "9876" })).status, 200);
// 동명이인은 이름1 로 등록된다
const dup = await admin("/api/admin/users", "POST", { name: uid, pin: "1111" });
assert.equal(dup.body.uid, uid + "1");
await admin(`/api/admin/users?id=${dup.body.id}`, "DELETE");

// 3~4. 본인 인증: 틀린 PIN 거부, 맞으면 쿠키
assert.equal((await phone("/api/auth/login", "POST", { uid, pin: "0000" })).status, 401);
assert.equal((await phone("/api/me/qr")).status, 401, "인증 없이 QR 발급 불가");
assert.equal((await phone("/api/auth/login", "POST", { uid, pin: "9876" })).status, 200);

// 5. QR 발급: UID 가 노출되지 않고, 다시 받아도 같다
const qr1 = (await phone("/api/me/qr")).body.qr;
assert.ok(qr1.startsWith("BORIGIN1:") && !qr1.includes(uid));
assert.equal((await phone("/api/me/qr")).body.qr, qr1);

// 6~7. 마이페이지 통계
const before = (await phone("/api/me")).body;
assert.equal(before.summary.total, 0);
assert.ok(before.sessions.some((s) => s.session_date === today));

// 10~13. 체크인 성공 → DB 저장
const ok = (await admin("/api/check-in", "POST", { token: qr1 })).body;
assert.equal(ok.result, "success", JSON.stringify(ok));
assert.equal(ok.name, uid);
assert.equal(ok.total, 1);

// 14~17. 마이페이지에 반영
const after = (await phone("/api/me")).body;
assert.equal(after.summary.total, 1);
assert.equal(after.summary.week, 1);
assert.ok(after.records.some((r) => r.attendance_date === today));

// 19. 같은 QR 다시 → 중복
assert.equal((await admin("/api/check-in", "POST", { token: qr1 })).body.result, "duplicate");
const again = (await phone("/api/me")).body;
assert.equal(again.records.length, after.records.length, "중복 출석이 저장되면 안 됨");

// 위조·폐기 QR
assert.equal((await admin("/api/check-in", "POST", { token: "BORIGIN1:forged" })).body.result, "invalid");
const qr2 = (await phone("/api/me/qr", "POST")).body.qr;
assert.notEqual(qr2, qr1);
assert.equal((await admin("/api/check-in", "POST", { token: qr1 })).body.result, "invalid", "재발급 후 이전 QR 은 무효");
assert.equal((await admin("/api/check-in", "POST", { token: qr2 })).body.result, "duplicate");

// 20. 관리자 조회
const dash = (await admin(`/api/admin/dashboard?q=${uid}`)).body;
assert.ok(dash.rows.some((r) => r.uid === uid && r.present));
assert.ok(dash.programs.some((p) => p.program_name === "스모크 테스트" && p.checkins === 1));
const me = dash.people.find((p) => p.uid === uid);
assert.equal(me.days, 1);
const hist = (await admin(`/api/admin/dashboard?user=${me.id}`)).body.history;
// 오늘 진행 회차마다 1건 (하루에 프로그램이 여러 개일 수 있다), 출석일은 1일
assert.equal(hist.length, dash.sessions.filter((s) => s.status === "scheduled").length);

// 휴강 처리하면 그날은 목표·결석 계산에서 빠진다
const progs = (await admin("/api/admin/programs")).body.programs;
const sp = progs.find((p) => p.id === prog.body.id);
assert.equal((await admin("/api/admin/sessions", "POST", { program_id: sp.id, session_date: today, session_name: "x" })).status, 409, "같은 날 같은 프로그램 회차 중복 불가");

// 정리
await admin(`/api/admin/users?id=${me.id}`, "DELETE");
await admin(`/api/admin/programs?id=${sp.id}`, "DELETE");

console.log("smoke: 모든 시나리오 통과 ✔");
