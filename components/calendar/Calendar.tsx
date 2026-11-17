"use client";
import { dayState, type DayState, type Session } from "@/lib/attendance/summary";
import { CheckIcon } from "../attendance/Modal";

const HEAD = ["일", "월", "화", "수", "목", "금", "토"];

const circle: Record<DayState, string> = {
  attended: "bg-brand text-white",
  upcoming: "bg-mist text-brand",
  missed: "text-navy",
  cancelled: "text-muted/60 line-through",
  none: "text-navy",
};

export function Calendar({
  month,
  onMonth,
  byDate,
  attended,
  today,
  selected,
  onSelect,
}: {
  month: string; // 'YYYY-MM'
  onMonth: (delta: number) => void;
  byDate: Map<string, Session[]>;
  attended: Set<string>;
  today: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];

  const navBtn = "grid h-9 w-9 place-items-center rounded-full border border-line text-navy hover:bg-mist";
  return (
    <section aria-label="출석 달력">
      <div className="flex items-center justify-between">
        <button className={navBtn} onClick={() => onMonth(-1)} aria-label="이전 달">‹</button>
        <h2 className="text-lg font-black" aria-live="polite">{y}년 {m}월</h2>
        <button className={navBtn} onClick={() => onMonth(1)} aria-label="다음 달">›</button>
      </div>

      <div className="mt-4 grid grid-cols-7 border-b border-line pb-2 text-center text-xs font-bold">
        {HEAD.map((h, i) => (
          <span key={h} className={i === 0 ? "text-danger" : i === 6 ? "text-brand" : "text-muted"}>{h}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`b${i}`} />;
          const st = dayState(date, byDate.get(date), attended, today);
          const isToday = date === today;
          const label = isToday ? "오늘" : st === "cancelled" ? "휴강" : "";
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              aria-label={`${Number(date.slice(8))}일 ${{ attended: "출석 완료", missed: "미출석", upcoming: "출석 예정", cancelled: "휴강", none: "" }[st]}`}
              aria-pressed={selected === date}
              className={`flex h-[60px] flex-col items-center justify-start gap-0.5 rounded-xl pt-1 ${selected === date ? "bg-sprout" : ""}`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold ${circle[st]} ${
                  isToday ? (st === "attended" ? "ring-2 ring-leaf ring-offset-2" : "border-2 border-brand font-black text-brand") : ""
                }`}
              >
                {st === "attended" ? <CheckIcon /> : Number(date.slice(8))}
              </span>
              {label ? (
                <span className={`text-[10px] font-bold leading-none ${isToday ? "text-brand" : "text-muted"}`}>{label}</span>
              ) : st === "missed" ? (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-danger/70" />
              ) : null}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-brand" />출석</li>
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-mist ring-1 ring-brand/20" />예정</li>
        <li className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-danger/70" />미출석</li>
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border-2 border-brand" />오늘</li>
      </ul>
    </section>
  );
}
