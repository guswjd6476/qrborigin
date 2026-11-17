// 실행: npm test
import assert from "node:assert/strict";
import { dayState, summarize, type AttendanceRecord, type Session } from "./summary";

const prog = { program_id: "p", program_name: "P", weekly_attendance_goal: 3, start_date: "2026-11-01", end_date: "2026-11-30" };
const s = (date: string, status: Session["status"] = "scheduled"): Session => ({ id: date, session_date: date, session_name: "", status, ...prog });
const r = (date: string, sid = date): AttendanceRecord => ({ id: sid, session_id: sid, program_id: "p", attendance_date: date, checked_in_at: date + "T10:00:00Z" });

// 2026-11-17 은 화요일 → 주간 11-16(월) ~ 11-22(일)
const sessions = [s("2026-11-09"), s("2026-11-16"), s("2026-11-18"), s("2026-11-20")];
let sum = summarize(sessions, [r("2026-11-09"), r("2026-11-16"), r("2026-10-30")], "2026-11-17");
assert.equal(sum.total, 3);
assert.equal(sum.month, 2);
assert.equal(sum.week, 1);
assert.equal(sum.weekGoal, 3);
assert.equal(sum.weekAchieved, false);

// 하루에 두 프로그램 출석해도 1일
sum = summarize(sessions, [r("2026-11-16", "a"), r("2026-11-16", "b")], "2026-11-17");
assert.equal(sum.total, 1);

// 휴강으로 이번 주 진행일이 2일이면 목표도 2, 2회 출석 = 달성
const withCancel = [s("2026-11-16"), s("2026-11-18", "cancelled"), s("2026-11-20")];
sum = summarize(withCancel, [r("2026-11-16"), r("2026-11-20")], "2026-11-21");
assert.equal(sum.weekGoal, 2);
assert.equal(sum.weekAchieved, true);

// 프로그램 없는 주: 목표 0, 달성 아님
sum = summarize([], [], "2026-11-17");
assert.equal(sum.weekGoal, 0);
assert.equal(sum.weekAchieved, false);

// 일요일은 같은 주(월~일)에 포함
sum = summarize([s("2026-11-22")], [r("2026-11-22")], "2026-11-22");
assert.equal(sum.week, 1);

// 날짜 상태: 프로그램 없는 날은 결석이 아니다
const att = new Set(["2026-11-09"]);
assert.equal(dayState("2026-11-09", [s("2026-11-09")], att, "2026-11-17"), "attended");
assert.equal(dayState("2026-11-16", [s("2026-11-16")], att, "2026-11-17"), "missed");
assert.equal(dayState("2026-11-17", [s("2026-11-17")], att, "2026-11-17"), "upcoming");
assert.equal(dayState("2026-11-15", undefined, att, "2026-11-17"), "none");
assert.equal(dayState("2026-11-13", [s("2026-11-13", "cancelled")], att, "2026-11-17"), "cancelled");

console.log("summary.test: all passed");
