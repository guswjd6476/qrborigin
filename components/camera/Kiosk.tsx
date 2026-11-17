"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { timeKst } from "@/lib/dates";
import { CheckIcon } from "../attendance/Modal";
import { Logo } from "../layout/Logo";

type Phase =
  | { k: "waiting" }
  | { k: "checking" }
  | { k: "success"; name: string; at: string; total: number }
  | { k: "duplicate"; name: string; at?: string }
  | { k: "invalid" }
  | { k: "no_session"; name: string }
  | { k: "error"; msg: string };

const RESULT_MS = 2500; // 결과 표시 후 자동으로 대기
const SAME_QR_MS = 5000; // 같은 QR 연속 인식 무시
const READER_ID = "qr-reader";

export function Kiosk() {
  const [phase, setPhase] = useState<Phase>({ k: "waiting" });
  const [camErr, setCamErr] = useState<string | null>(null);
  const [camKey, setCamKey] = useState(0); // 바꾸면 카메라 재시작
  const busy = useRef(false);
  const last = useRef({ text: "", at: 0 });
  const stopping = useRef<Promise<void>>(Promise.resolve());

  const handle = useCallback(async (text: string) => {
    const now = Date.now();
    if (busy.current || (text === last.current.text && now - last.current.at < SAME_QR_MS)) return;
    busy.current = true;
    last.current = { text, at: now };
    setPhase({ k: "checking" });
    let next: Phase;
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: text }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 401) {
        location.reload(); // 관리자 세션 만료 → 로그인 화면
        return;
      }
      const r = await res.json();
      next =
        r.result === "success" ? { k: "success", name: r.name, at: r.checkedInAt, total: r.total }
        : r.result === "duplicate" ? { k: "duplicate", name: r.name, at: r.checkedInAt }
        : r.result === "no_session" ? { k: "no_session", name: r.name }
        : r.result === "invalid" ? { k: "invalid" }
        : { k: "error", msg: "서버 오류가 발생했습니다." };
    } catch {
      next = { k: "error", msg: "네트워크 연결을 확인해 주세요." };
      last.current = { text: "", at: 0 }; // 네트워크 실패는 같은 QR 로 바로 다시 시도 가능
    }
    setPhase(next);
    setTimeout(() => {
      setPhase({ k: "waiting" });
      busy.current = false;
    }, RESULT_MS);
  }, []);

  // 카메라 시작/정리 (StrictMode 의 이중 실행에도 안전하게)
  useEffect(() => {
    if (!window.isSecureContext) {
      setCamErr("카메라는 HTTPS(또는 localhost)에서만 사용할 수 있습니다.");
      return;
    }
    let scanner: Html5Qrcode | null = null;
    let cancelled = false;
    setCamErr(null);
    const started = (async () => {
      await stopping.current; // 이전 스캐너가 완전히 멈춘 뒤 시작
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      await scanner.start({ facingMode: "user" }, { fps: 12 }, (text) => void handle(text), () => {});
      const track = (document.querySelector(`#${READER_ID} video`) as HTMLVideoElement | null)?.srcObject as MediaStream | null;
      track?.getVideoTracks()[0]?.addEventListener("ended", () => setCamErr("카메라 연결이 끊어졌습니다."));
    })().catch((e) => {
      if (!cancelled) setCamErr(/NotAllowed|Permission/i.test(String(e)) ? "카메라 권한이 거부되었습니다. 주소창의 카메라 권한을 허용해 주세요." : "카메라를 찾을 수 없거나 다른 프로그램이 사용 중입니다.");
    });
    return () => {
      cancelled = true;
      stopping.current = started
        .then(async () => {
          if (scanner?.isScanning) await scanner.stop();
          scanner?.clear();
        })
        .catch(() => {});
    };
  }, [camKey, handle]);

  // 1분마다 카메라 상태 확인 (USB 카메라 분리 등)
  useEffect(() => {
    const t = setInterval(() => {
      const v = document.querySelector(`#${READER_ID} video`) as HTMLVideoElement | null;
      const track = (v?.srcObject as MediaStream | null)?.getVideoTracks()[0];
      if (!camErr && v && track?.readyState === "ended") setCamErr("카메라 연결이 끊어졌습니다.");
    }, 60_000);
    return () => clearInterval(t);
  }, [camErr]);

  const overlay = {
    success: "bg-leaf text-navy",
    duplicate: "bg-brand text-white",
    invalid: "bg-danger text-white",
    no_session: "bg-navy text-white",
    error: "bg-danger text-white",
  } as const;

  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="flex h-[9vh] min-h-14 items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Logo className="text-2xl" />
          <span className="h-5 w-px bg-line" />
          <span className="text-lg font-bold">출석 인증</span>
        </div>
        <Clock />
      </header>

      <main className="relative mx-6 flex-1 overflow-hidden rounded-3xl bg-navy">
        <div id={READER_ID} className="absolute inset-0" />

        {/* QR 가이드 프레임 */}
        {!camErr && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative aspect-square h-[55%]">
              {["left-0 top-0 border-l-[6px] border-t-[6px] rounded-tl-3xl", "right-0 top-0 border-r-[6px] border-t-[6px] rounded-tr-3xl", "left-0 bottom-0 border-l-[6px] border-b-[6px] rounded-bl-3xl", "right-0 bottom-0 border-r-[6px] border-b-[6px] rounded-br-3xl"].map((c) => (
                <span key={c} className={`absolute h-14 w-14 border-leaf ${c}`} />
              ))}
            </div>
          </div>
        )}

        {/* 상태 */}
        {!camErr && (phase.k === "waiting" || phase.k === "checking") && (
          <div className="absolute inset-x-0 bottom-8 flex justify-center">
            <p className="rounded-full bg-white/95 px-7 py-3 text-xl font-bold text-navy" aria-live="polite">
              {phase.k === "waiting" ? "QR 코드를 카메라에 보여주세요." : "QR 코드를 확인하고 있습니다…"}
            </p>
          </div>
        )}

        {phase.k !== "waiting" && phase.k !== "checking" && (
          <div className={`animate-fade absolute inset-0 grid place-items-center ${overlay[phase.k]}`} role="status" aria-live="assertive">
            <div className="animate-pop text-center">
              <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-white/25">
                {phase.k === "success" ? <CheckIcon size={64} /> : <span className="text-6xl font-black">{phase.k === "duplicate" ? "✓" : "!"}</span>}
              </div>
              {phase.k === "success" && (
                <>
                  <p className="mt-8 text-5xl font-black">출석 인증이 완료되었습니다!</p>
                  <p className="mt-5 text-3xl font-bold">{phase.name} 님 · {timeKst(phase.at)}</p>
                  <p className="mt-2 text-xl font-semibold opacity-80">누적 {phase.total}일 출석</p>
                </>
              )}
              {phase.k === "duplicate" && (
                <>
                  <p className="mt-8 text-5xl font-black">이미 출석이 완료된 사용자입니다.</p>
                  <p className="mt-5 text-3xl font-bold">{phase.name} 님{phase.at ? ` · ${timeKst(phase.at)} 출석` : ""}</p>
                </>
              )}
              {phase.k === "invalid" && <p className="mt-8 text-5xl font-black">등록되지 않은 QR 코드입니다.</p>}
              {phase.k === "no_session" && (
                <>
                  <p className="mt-8 text-5xl font-black">오늘 진행되는 프로그램이 없습니다.</p>
                  <p className="mt-5 text-3xl font-bold">{phase.name} 님</p>
                </>
              )}
              {phase.k === "error" && <p className="mt-8 text-5xl font-black">{phase.msg}</p>}
            </div>
          </div>
        )}

        {camErr && (
          <div className="absolute inset-0 grid place-items-center bg-navy text-center text-white">
            <div>
              <p className="text-3xl font-black">카메라를 사용할 수 없습니다</p>
              <p className="mt-3 text-lg opacity-80">{camErr}</p>
              <button onClick={() => setCamKey((k) => k + 1)} className="mt-8 rounded-2xl bg-leaf px-8 py-4 text-lg font-bold text-navy">
                카메라 다시 연결
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="flex h-[11vh] min-h-16 items-center justify-between px-8 text-base font-semibold text-muted">
        <p>휴대폰에서 <b className="text-navy">마이페이지 → 출석하기</b>를 눌러 나온 QR 을 네모 안에 비춰 주세요.</p>
        <button onClick={() => setCamKey((k) => k + 1)} className="rounded-full border border-line px-4 py-2 text-sm">카메라 재연결</button>
      </footer>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-lg font-bold tabular-nums text-muted">{now ? timeKst(now) : ""}</span>;
}
