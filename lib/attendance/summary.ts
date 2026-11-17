import { addDays, weekStart } from "../dates";

export type Session = {
  id: string;
  program_id: string;
  program_name: string;
  session_date: string;
  session_name: string;
  status: "scheduled" | "cancelled";
  weekly_attendance_goal: number;
  start_date: string;
  end_date: string;
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  program_id: string;
  attendance_date: string;
  checked_in_at: string;
};

export type Summary = {
  total: number; // 누적 출석일 수
  month: number;
  week: number;
  weekGoal: number; // 0 이면 이번 주 프로그램 없음
  weekAchieved: boolean;
  weekDays: string[]; // 이번 주 진행일(휴강 제외)
};

/** 출석은 '날짜' 기준으로 센다(하루에 프로그램이 여러 개여도 1일). 목표는 실제 등록된 진행일을 넘지 않는다. */
export function summarize(sessions: Session[], records: AttendanceRecord[], today: string): Summary {
  const days = [...new Set(records.map((r) => r.attendance_date))];
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  const inWeek = (d: string) => d >= ws && d <= we;
  const weekDays = [...new Set(sessions.filter((s) => s.status === "scheduled" && inWeek(s.session_date)).map((s) => s.session_date))].sort();
  const goals = sessions.filter((s) => s.start_date <= we && s.end_date >= ws).map((s) => s.weekly_attendance_goal);
  const weekGoal = Math.min(goals.length ? Math.max(...goals) : 0, weekDays.length); // 휴강으로 회차가 줄면 목표도 줄인다
  const week = days.filter(inWeek).length;
  return {
    total: days.length,
    month: days.filter((d) => d.startsWith(today.slice(0, 7))).length,
    week,
    weekGoal,
    weekAchieved: weekGoal > 0 && week >= weekGoal,
    weekDays,
  };
}

export type DayState = "attended" | "missed" | "upcoming" | "cancelled" | "none";

export function dayState(date: string, sessions: Session[] | undefined, attended: Set<string>, today: string): DayState {
  if (attended.has(date)) return "attended";
  const ss = sessions ?? [];
  if (!ss.some((s) => s.status === "scheduled")) return ss.length ? "cancelled" : "none";
  return date < today ? "missed" : "upcoming"; // 오늘 아직 안 했으면 '예정'
}
