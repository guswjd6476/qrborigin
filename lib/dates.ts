// 모든 날짜는 한국 시간 기준 'YYYY-MM-DD' 문자열로 다룬다.
const TZ = "Asia/Seoul";

export const todayKst = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO 요일: 1=월 … 7=일 */
export function isoDow(date: string) {
  const w = new Date(date + "T00:00:00Z").getUTCDay();
  return w === 0 ? 7 : w;
}

/** 주간 기준은 월요일 ~ 일요일 */
export const weekStart = (date: string) => addDays(date, 1 - isoDow(date));

export const timeKst = (iso: string | Date) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
/** '2026-11-17' → '2026년 11월 17일 (화)' */
export function fmtDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${DOW[new Date(date + "T00:00:00Z").getUTCDay()]})`;
}

export const isDateStr = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
