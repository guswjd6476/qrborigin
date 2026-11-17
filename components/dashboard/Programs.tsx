"use client";
import { useCallback, useEffect, useState } from "react";
import { addDays, fmtDate, todayKst } from "@/lib/dates";
import { AdminShell, api, btn, btnGhost, card, input } from "./AdminShell";

type SessionRow = { id: string; program_id: string; session_date: string; session_name: string; status: "scheduled" | "cancelled"; checkins: number };
type Program = { id: string; program_name: string; start_date: string; end_date: string; weekly_attendance_goal: number; days_of_week: number[]; sessions: SessionRow[] };

const DOW = ["월", "화", "수", "목", "금", "토", "일"]; // index+1 = ISO 요일

export function Programs({ demo }: { demo: boolean }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [err, setErr] = useState("");
  const load = useCallback(() => api<{ programs: Program[] }>("/api/admin/programs").then((d) => setPrograms(d.programs), (e) => setErr(e.message)), []);
  useEffect(() => void load(), [load]);

  /** 요청 → 성공하면 다시 불러오기, 실패하면 메시지 */
  const run = (p: Promise<unknown>) =>
    p.then(
      () => (setErr(""), load(), true),
      (e) => (setErr(e.message), false),
    );

  return (
    <AdminShell title="프로그램 및 일정 관리" demo={demo}>
      <p className="mt-2 text-sm text-muted">진행 요일로 회차를 자동 생성한 뒤, 회차마다 날짜 변경·휴강·보강 추가를 할 수 있습니다. 회차가 없는 날은 미출석으로 계산하지 않습니다.</p>
      {err && <p role="alert" className="mt-4 font-semibold text-danger">{err}</p>}
      <NewProgram onCreate={(b) => run(api("/api/admin/programs", "POST", b))} />
      <div className="mt-10 space-y-6">
        {programs.length === 0 && <p className="text-muted">등록된 프로그램이 없습니다.</p>}
        {programs.map((p) => <ProgramCard key={p.id} p={p} run={run} />)}
      </div>
    </AdminShell>
  );
}

function NewProgram({ onCreate }: { onCreate: (b: object) => Promise<boolean> }) {
  const today = todayKst();
  const [f, setF] = useState({ program_name: "", start_date: today, end_date: addDays(today, 83), weekly_attendance_goal: 3, days_of_week: [1, 3, 5] });
  const toggle = (d: number) => setF({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter((x) => x !== d) : [...f.days_of_week, d].sort() });
  return (
    <form
      className={`${card} mt-6 grid gap-4 p-5 md:grid-cols-2`}
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(f).then((ok) => ok && setF({ ...f, program_name: "" }));
      }}
    >
      <p className="font-black md:col-span-2">새 프로그램</p>
      <label className="text-sm font-bold">프로그램명<input className={`${input} mt-1 w-full`} value={f.program_name} onChange={(e) => setF({ ...f, program_name: e.target.value })} required /></label>
      <label className="text-sm font-bold">
        주간 출석 목표
        <select className={`${input} mt-1 w-full`} value={f.weekly_attendance_goal} onChange={(e) => setF({ ...f, weekly_attendance_goal: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>주 {n}회</option>)}
        </select>
      </label>
      <label className="text-sm font-bold">시작일<input type="date" className={`${input} mt-1 w-full`} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} required /></label>
      <label className="text-sm font-bold">종료일<input type="date" className={`${input} mt-1 w-full`} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} required /></label>
      <fieldset className="md:col-span-2">
        <legend className="text-sm font-bold">진행 요일 (회차 자동 생성)</legend>
        <div className="mt-2 flex gap-2">
          {DOW.map((d, i) => (
            <button type="button" key={d} aria-pressed={f.days_of_week.includes(i + 1)} onClick={() => toggle(i + 1)}
              className={`h-10 w-10 rounded-full text-sm font-bold ${f.days_of_week.includes(i + 1) ? "bg-brand text-white" : "border border-line text-muted"}`}>{d}</button>
          ))}
        </div>
      </fieldset>
      <div className="md:col-span-2"><button className={btn}>프로그램 등록</button></div>
    </form>
  );
}

function ProgramCard({ p, run }: { p: Program; run: (x: Promise<unknown>) => Promise<boolean> }) {
  const [name, setName] = useState(p.program_name);
  const [goal, setGoal] = useState(p.weekly_attendance_goal);
  const [open, setOpen] = useState(false);
  const [add, setAdd] = useState({ session_date: todayKst(), session_name: "보강" });
  const today = todayKst();
  const upcoming = p.sessions.filter((s) => s.session_date >= today && s.status === "scheduled").length;
  const patch = (id: string, b: object) => run(api("/api/admin/sessions", "PATCH", { id, ...b }));

  return (
    <section className={card}>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-5">
        <label className="text-xs font-bold text-muted">프로그램명<input className={`${input} mt-1 block w-64 text-base text-navy`} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-xs font-bold text-muted">
          주간 목표
          <select className={`${input} mt-1 block text-navy`} value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>주 {n}회</option>)}
          </select>
        </label>
        <button className={btn} onClick={() => run(api("/api/admin/programs", "PATCH", { id: p.id, program_name: name, weekly_attendance_goal: goal }))}>저장</button>
        <div className="ml-auto text-right text-sm">
          <p className="font-bold">{p.start_date} ~ {p.end_date}</p>
          <p className="text-muted">회차 {p.sessions.length}개 · 남은 회차 {upcoming}개 · 진행 요일 {p.days_of_week.map((d) => DOW[d - 1]).join("·")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-5">
        <button className={btnGhost} onClick={() => setOpen(!open)}>{open ? "회차 접기" : "회차 보기·수정"}</button>
        <span className="mx-2 h-5 w-px bg-line" />
        <input type="date" className={input} value={add.session_date} onChange={(e) => setAdd({ ...add, session_date: e.target.value })} aria-label="추가할 회차 날짜" />
        <input className={`${input} w-32`} value={add.session_name} onChange={(e) => setAdd({ ...add, session_name: e.target.value })} aria-label="회차 이름" />
        <button className={btnGhost} onClick={() => run(api("/api/admin/sessions", "POST", { program_id: p.id, ...add }))}>회차 추가</button>
        <button className={`${btnGhost} ml-auto text-danger`} onClick={() => confirm(`'${p.program_name}' 과 모든 회차·출석 기록을 삭제할까요?`) && run(api(`/api/admin/programs?id=${p.id}`, "DELETE"))}>프로그램 삭제</button>
      </div>
      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {p.sessions.map((s) => (
            <li key={s.id} className={`flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm ${s.status === "cancelled" ? "bg-mist/60 text-muted" : ""}`}>
              <input type="date" className={input} defaultValue={s.session_date} aria-label="회차 날짜"
                onBlur={(e) => e.target.value !== s.session_date && patch(s.id, { session_date: e.target.value })} />
              <span className="w-40 font-semibold">{fmtDate(s.session_date).slice(5)}</span>
              <input className={`${input} w-28`} defaultValue={s.session_name} aria-label="회차 이름" onBlur={(e) => e.target.value !== s.session_name && patch(s.id, { session_name: e.target.value })} />
              <span className="font-bold">{s.status === "cancelled" ? "휴강" : s.session_date < today ? "진행 완료" : "예정"}</span>
              <span className="text-muted">출석 {s.checkins}명</span>
              <span className="ml-auto space-x-1">
                <button className={btnGhost} onClick={() => patch(s.id, { status: s.status === "cancelled" ? "scheduled" : "cancelled" })}>{s.status === "cancelled" ? "휴강 취소" : "휴강 처리"}</button>
                <button className={`${btnGhost} text-danger`} onClick={() => confirm(s.checkins ? `이 회차의 출석 기록 ${s.checkins}건도 함께 삭제됩니다. 계속할까요?` : "이 회차를 삭제할까요?") && run(api(`/api/admin/sessions?id=${s.id}`, "DELETE"))}>삭제</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
