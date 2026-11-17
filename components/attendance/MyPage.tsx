"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceRecord, Session, Summary } from "@/lib/attendance/summary";
import { fmtDate, timeKst } from "@/lib/dates";
import type { RealtimeConfig } from "@/lib/supabase/jwt";
import { subscribeAttendance } from "@/lib/supabase/realtime";
import { Calendar } from "../calendar/Calendar";
import { DemoBadge, GreenBar } from "../layout/Logo";
import { MobileHeader } from "../layout/MobileHeader";
import { LoginForm } from "./LoginForm";
import { Modal } from "./Modal";

type MeData = {
  user: { id: string; uid: string; name: string };
  today: string;
  sessions: Session[];
  records: AttendanceRecord[];
  summary: Summary;
  realtime: RealtimeConfig | null;
  demo: boolean;
};

const DEMO_POLL_MS = 3000;

export function MyPage() {
  const router = useRouter();
  const [data, setData] = useState<MeData | null>(null);
  const [unauth, setUnauth] = useState(false);
  const [month, setMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [popup, setPopup] = useState<AttendanceRecord | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const live = useRef<ReturnType<typeof subscribeAttendance> | null>(null);

  /** 항상 서버에서 최신 상태를 다시 받는다. 처음 본 '오늘' 출석이 있으면 완료 팝업 */
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.status === 401) return setUnauth(true);
      if (!res.ok) return;
      const d: MeData = await res.json();
      if (seen.current) {
        const fresh = d.records.find((r) => !seen.current!.has(r.id) && r.attendance_date === d.today);
        if (fresh) setPopup(fresh);
      } else if (new URLSearchParams(location.search).has("checked")) {
        // QR 화면에서 출석 직후 넘어온 경우: 오늘 출석 완료 팝업
        const todays = d.records.filter((r) => r.attendance_date === d.today);
        if (todays.length) setPopup(todays[todays.length - 1]);
        history.replaceState(null, "", "/my-page");
      }
      seen.current = new Set(d.records.map((r) => r.id));
      if (d.realtime) live.current?.setToken(d.realtime.token);
      setUnauth(false);
      setData(d);
    } catch {
      // 오프라인: 마지막 화면 유지, online 이벤트 때 다시 받는다
    }
  }, []);

  useEffect(() => void load(), [load]);

  // 실시간 구독 (Supabase) — 없으면 데모 폴링
  const userId = data?.user.id;
  const rtCfg = useRef<RealtimeConfig | null>(null);
  rtCfg.current = data?.realtime ?? null;
  const hasRealtime = !!data?.realtime;
  useEffect(() => {
    if (!userId) return;
    if (hasRealtime && rtCfg.current) {
      live.current = subscribeAttendance(rtCfg.current, userId, load);
      return () => {
        live.current?.close();
        live.current = null;
      };
    }
    // shortcut: 데모 모드는 Realtime 대신 3초 폴링, 운영(Supabase 설정 시)은 위의 Realtime 사용
    const t = setInterval(() => document.visibilityState === "visible" && load(), DEMO_POLL_MS);
    return () => clearInterval(t);
  }, [userId, hasRealtime, load]);

  // 백그라운드 복귀·네트워크 복구 때 최신 데이터
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", load);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", load);
    };
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, Session[]>();
    data?.sessions.forEach((s) => m.set(s.session_date, [...(m.get(s.session_date) ?? []), s]));
    return m;
  }, [data?.sessions]);
  const attended = useMemo(() => new Set(data?.records.map((r) => r.attendance_date)), [data?.records]);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    seen.current = null;
    setData(null);
    setUnauth(true);
  }

  if (unauth)
    return (
      <>
        <MobileHeader />
        <LoginForm onDone={load} />
      </>
    );
  if (!data)
    return (
      <>
        <MobileHeader />
        <p className="mt-20 text-center text-muted">불러오는 중…</p>
      </>
    );

  const { summary: s, today } = data;
  const viewMonth = month ?? today.slice(0, 7);
  const sel = selected ?? today;
  const todayRecord = data.records.find((r) => r.attendance_date === today);

  function shiftMonth(delta: number) {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }

  return (
    <>
      {data.demo && <DemoBadge />}
      <MobileHeader onLogout={logout} />
      <main className="mx-auto max-w-md px-5 pb-40 pt-6">
        <p className="text-sm font-semibold text-muted">{data.user.name} 님의 출석</p>

        {/* 통계 */}
        <section className="mt-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-bold">총 출석일 수</p>
              <p className="mt-1 text-5xl font-black tracking-tight text-brand">
                {s.total}
                <span className="ml-1 text-2xl">일</span>
              </p>
            </div>
            <GreenBar className="mb-3 w-12" />
          </div>
          <div className="mt-5 grid grid-cols-2 divide-x divide-line rounded-2xl border border-line">
            <div className="p-4">
              <p className="text-xs font-bold text-muted">이번 달 출석</p>
              <p className="mt-1 text-2xl font-black">{s.month}<span className="text-base">회</span></p>
            </div>
            <div className="p-4">
              <p className="text-xs font-bold text-muted">이번 주 출석</p>
              <p className="mt-1 text-2xl font-black">
                {s.week}
                <span className="text-base text-muted"> / {s.weekGoal}회</span>
              </p>
            </div>
          </div>
        </section>

        {/* 주간 목표 */}
        <section className={`mt-4 rounded-2xl p-4 ${s.weekAchieved ? "bg-leaf text-navy" : "bg-sprout"}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">이번 주 출석 목표</p>
            <div className="flex gap-1.5" aria-label={`${s.week} / ${s.weekGoal}회`}>
              {Array.from({ length: s.weekGoal }, (_, i) => (
                <span key={i} className={`h-4 w-4 rounded-full ${i < s.week ? (s.weekAchieved ? "bg-white" : "bg-leaf") : "border-2 border-leaf bg-white"}`} />
              ))}
            </div>
          </div>
          <p className="mt-1 text-[15px] font-black">
            {s.weekGoal === 0
              ? "이번 주는 진행되는 프로그램이 없어요"
              : s.weekAchieved
                ? `주간 목표 달성! ${s.week} / ${s.weekGoal}회 🎉`
                : `${Math.min(s.week, s.weekGoal)} / ${s.weekGoal}회 출석 완료`}
          </p>
        </section>

        {/* 달력 */}
        <div className="mt-6 rounded-3xl border border-line p-4">
          <Calendar month={viewMonth} onMonth={shiftMonth} byDate={byDate} attended={attended} today={today} selected={sel} onSelect={setSelected} />
        </div>

        {/* 선택한 날짜 상세 */}
        <section className="mt-4 rounded-2xl bg-mist p-4" aria-live="polite">
          <p className="text-sm font-black">{fmtDate(sel)}</p>
          {(byDate.get(sel) ?? []).length === 0 ? (
            <p className="mt-1 text-sm text-muted">프로그램이 없는 날이에요.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {byDate.get(sel)!.map((ss) => {
                const rec = data.records.find((r) => r.session_id === ss.id);
                const status =
                  ss.status === "cancelled" ? "휴강" : rec ? `출석 완료 · ${timeKst(rec.checked_in_at)}` : sel < today ? "미출석" : "출석 예정";
                return (
                  <li key={ss.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm">
                    <span className="font-bold">
                      {ss.program_name}
                      {ss.session_name && <span className="ml-1 font-semibold text-muted">{ss.session_name}</span>}
                    </span>
                    <span className={`font-bold ${rec ? "text-brand" : status === "미출석" ? "text-danger" : "text-muted"}`}>{status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* 하단 출석하기 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => (todayRecord ? setDupOpen(true) : router.push("/my-qr"))}
            className="w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white active:bg-brand-deep"
          >
            출석하기
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-muted">현장 출석 인증 카메라에 나의 QR을 보여주세요.</p>
        </div>
      </div>

      {popup && (
        <Modal
          title="출석 체크 완료!"
          body="오늘 출석 인증이 정상적으로 완료되었습니다."
          rows={[
            ["이름", data.user.name],
            ["출석 날짜", fmtDate(popup.attendance_date)],
            ["인증 시간", timeKst(popup.checked_in_at)],
            ["누적 출석", `${s.total}일`],
          ]}
          onClose={() => setPopup(null)}
        />
      )}
      {dupOpen && todayRecord && (
        <Modal
          tone="info"
          title="이미 출석했어요"
          body="오늘 출석 인증은 이미 완료되었습니다."
          rows={[["인증 시간", timeKst(todayRecord.checked_in_at)]]}
          onClose={() => setDupOpen(false)}
          extra={<Link href="/my-qr" className="mt-3 block text-sm font-semibold text-muted underline underline-offset-4">그래도 QR 보기</Link>}
        />
      )}
    </>
  );
}
