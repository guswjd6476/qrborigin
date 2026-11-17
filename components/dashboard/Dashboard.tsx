"use client";
import { useCallback, useEffect, useState } from "react";
import { fmtDate, timeKst } from "@/lib/dates";
import { AdminShell, api, btn, btnGhost, card, input } from "./AdminShell";

type Data = {
  demo: boolean;
  date: string;
  today: string;
  stats: { users: number; present: number; absent: number; rate: number | null };
  sessions: { id: string; program_name: string; session_name: string; status: string }[];
  rows: { user_id: string; name: string; uid: string; program_name: string; session_name: string; session_date: string; checked_in_at: string | null; present: boolean }[];
  people: { id: string; uid: string; name: string; days: number; last_check_in: string | null }[];
  programs: { id: string; program_name: string; start_date: string; end_date: string; weekly_attendance_goal: number; held: number; checkins: number; rate: number | null }[];
  history: { attendance_date: string; checked_in_at: string; program_name: string; session_name: string }[] | null;
};

export function Dashboard() {
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams({ q: search });
    if (date) p.set("date", date);
    if (user) p.set("user", user.id);
    try {
      setData(await api<Data>(`/api/admin/dashboard?${p}`));
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [date, search, user]);

  useEffect(() => {
    const t = setTimeout(load, 200); // 검색 입력 디바운스
    const i = setInterval(load, 15_000); // 현장 진행 중 자동 갱신
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [load]);

  const stat = (label: string, value: string, accent = false) => (
    <div className={`${card} p-5`}>
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className={`mt-2 text-4xl font-black ${accent ? "text-brand" : ""}`}>{value}</p>
    </div>
  );

  return (
    <AdminShell title="출석 대시보드" demo={data?.demo}>
      {err && <p className="mt-4 text-danger">{err}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input type="date" className={input} value={date || data?.date || ""} onChange={(e) => setDate(e.target.value)} aria-label="조회 날짜" />
        {date && date !== data?.today && <button className={btnGhost} onClick={() => setDate("")}>오늘로</button>}
        <input className={`${input} w-64`} placeholder="이름 또는 UID 검색" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="사용자 검색" />
      </div>

      {data && (
        <>
          <p className="mt-6 text-lg font-black">
            {fmtDate(data.date)}
            <span className="ml-2 text-sm font-semibold text-muted">
              {data.sessions.length ? data.sessions.map((s) => `${s.program_name} ${s.session_name}${s.status === "cancelled" ? "(휴강)" : ""}`).join(" · ") : "진행 회차 없음"}
            </span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stat("전체 등록 인원", `${data.stats.users}명`)}
            {stat("출석 인원", `${data.stats.present}명`, true)}
            {stat("미출석 인원", `${data.stats.absent}명`)}
            {stat("출석률", data.stats.rate === null ? "-" : `${data.stats.rate}%`, true)}
          </div>

          <section className="mt-10">
            <h2 className="text-xl font-black">출석 목록</h2>
            <div className={`${card} mt-3 overflow-x-auto`}>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line bg-mist text-left text-xs text-muted">
                  <tr>{["이름", "UID", "프로그램", "출석 날짜", "인증 시간", "출석 여부"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">이 날짜에 진행된 회차가 없습니다.</td></tr>}
                  {data.rows.map((r) => (
                    <tr key={r.user_id + r.session_name + r.program_name}>
                      <td className="px-4 py-3 font-bold">{r.name}</td>
                      <td className="px-4 py-3 text-muted">{r.uid}</td>
                      <td className="px-4 py-3">{r.program_name} <span className="text-muted">{r.session_name}</span></td>
                      <td className="px-4 py-3">{r.session_date}</td>
                      <td className="px-4 py-3 tabular-nums">{r.checked_in_at ? timeKst(r.checked_in_at) : "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.present ? "bg-sprout text-leaf-deep" : "bg-mist text-muted"}`}>{r.present ? "출석" : "미출석"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-black">프로그램별 출석 통계</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {data.programs.map((p) => (
                <div key={p.id} className={`${card} p-5`}>
                  <p className="font-black">{p.program_name}</p>
                  <p className="text-xs font-semibold text-muted">{p.start_date} ~ {p.end_date} · 주 {p.weekly_attendance_goal}회 목표</p>
                  <div className="mt-4 flex gap-8 text-sm">
                    <div><p className="text-muted">진행 회차</p><p className="text-2xl font-black">{p.held}</p></div>
                    <div><p className="text-muted">누적 출석</p><p className="text-2xl font-black">{p.checkins}</p></div>
                    <div><p className="text-muted">평균 출석률</p><p className="text-2xl font-black text-brand">{p.rate === null ? "-" : `${p.rate}%`}</p></div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-leaf" style={{ width: `${p.rate ?? 0}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <People data={data} reload={load} selected={user} onSelect={setUser} />
        </>
      )}
    </AdminShell>
  );
}

function People({ data, reload, selected, onSelect }: { data: Data; reload: () => void; selected: { id: string; name: string } | null; onSelect: (u: { id: string; name: string } | null) => void }) {
  const [form, setForm] = useState({ name: "", pin: "" });
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { uid } = await api<{ uid: string }>("/api/admin/users", "POST", form);
      setMsg(`${form.name} 님을 등록했습니다. 로그인 ID: ${uid}`);
      setForm({ name: "", pin: "" });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function changePin(id: string, uid: string) {
    const pin = prompt(`${uid} 님의 새 비밀번호 (4자 이상)`);
    if (!pin) return;
    try {
      await api("/api/admin/users", "PATCH", { id, action: "pin", pin });
      setMsg(`${uid} 님의 비밀번호를 바꿨습니다.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function act(id: string, name: string, kind: "reissue" | "delete") {
    if (kind === "reissue" && confirm(`${name} 님의 QR 을 재발급할까요? 이전 QR 은 사용할 수 없게 됩니다.`)) await api("/api/admin/users", "PATCH", { id, action: "reissue" });
    if (kind === "delete" && confirm(`${name} 님과 모든 출석 기록을 삭제할까요? 되돌릴 수 없습니다.`)) await api(`/api/admin/users?id=${id}`, "DELETE");
    reload();
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-black">사용자</h2>
      <form onSubmit={save} className="mt-3 flex flex-wrap gap-2">
        <input className={input} placeholder="이름 (로그인 ID)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className={input} placeholder="비밀번호 (4자 이상)" type="password" autoComplete="new-password" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} required />
        <button className={btn}>사용자 등록</button>
      </form>
      {msg && <p className="mt-2 text-sm font-semibold text-brand">{msg}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line bg-mist text-left text-xs text-muted">
              <tr>{["이름", "UID", "누적 출석일", "최근 인증", ""].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.people.map((p) => (
                <tr key={p.id} className={selected?.id === p.id ? "bg-sprout" : ""}>
                  <td className="px-4 py-3"><button className="font-bold underline-offset-4 hover:underline" onClick={() => onSelect({ id: p.id, name: p.name })}>{p.name}</button></td>
                  <td className="px-4 py-3 text-muted">{p.uid}</td>
                  <td className="px-4 py-3 font-bold">{p.days}일</td>
                  <td className="px-4 py-3 text-muted">{p.last_check_in ? new Date(p.last_check_in).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</td>
                  <td className="space-x-1 px-4 py-3 text-right">
                    <button className={btnGhost} onClick={() => changePin(p.id, p.uid)}>비밀번호 변경</button>
                    <button className={btnGhost} onClick={() => act(p.id, p.name, "reissue")}>QR 재발급</button>
                    <button className={`${btnGhost} text-danger`} onClick={() => act(p.id, p.name, "delete")}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className={`${card} p-5`}>
          {!selected || !data.history ? (
            <p className="text-sm text-muted">이름을 누르면 그 사용자의 출석 기록을 볼 수 있습니다.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="font-black">{selected.name} 님 출석 기록</p>
                <button className="text-xs font-semibold text-muted" onClick={() => onSelect(null)}>닫기</button>
              </div>
              <ul className="mt-3 max-h-96 divide-y divide-line overflow-y-auto text-sm">
                {data.history.length === 0 && <li className="py-3 text-muted">출석 기록이 없습니다.</li>}
                {data.history.map((h, i) => (
                  <li key={i} className="flex justify-between py-2.5">
                    <span>{h.attendance_date} <span className="text-muted">{h.program_name} {h.session_name}</span></span>
                    <span className="tabular-nums font-bold">{timeKst(h.checked_in_at)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
