"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoginForm } from "../attendance/LoginForm";
import { MobileHeader } from "../layout/MobileHeader";
import { GreenBar } from "../layout/Logo";

type Me = { uid: string; name: string; qr: string };

const WATCH_MS = 3000;

export function MyQr() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | "unauth" | "error">(null);
  const [img, setImg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/qr", { cache: "no-store" });
      setMe(res.status === 401 ? "unauth" : res.ok ? await res.json() : "error");
    } catch {
      setMe("error");
    }
  }, []);
  useEffect(() => void load(), [load]);

  useEffect(() => {
    if (me && typeof me === "object")
      QRCode.toDataURL(me.qr, { width: 720, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0b1a3a", light: "#ffffff" } }).then(setImg);
  }, [me]);

  // QR 이 찍히면(새 출석 기록이 생기면) 달력 화면으로 넘어간다
  const loggedIn = !!me && typeof me === "object";
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!loggedIn) return;
    known.current = null;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const ids: string[] = (await res.json()).records.map((r: { id: string }) => r.id);
        if (known.current && ids.some((id) => !known.current!.has(id))) return router.push("/my-page?checked=1");
        known.current = new Set(ids);
      } catch {
        // 오프라인: 다음 주기에 다시 확인
      }
    };
    check();
    // shortcut: Realtime 대신 3초 폴링(QR 화면을 켜 둔 동안만), 사용자가 아주 많아지면 Realtime 구독으로 바꾸기
    const t = setInterval(check, WATCH_MS);
    return () => clearInterval(t);
  }, [loggedIn, router]);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    setMe("unauth");
  }

  async function reissue() {
    if (!confirm("QR 을 새로 발급할까요? 이전 QR(저장한 이미지 포함)은 더 이상 사용할 수 없습니다.")) return;
    const res = await fetch("/api/me/qr", { method: "POST" });
    if (res.ok && me && typeof me === "object") setMe({ ...me, qr: (await res.json()).qr });
  }

  if (me === "unauth")
    return (
      <>
        <MobileHeader />
        <LoginForm onDone={load} />
      </>
    );

  return (
    <>
      <MobileHeader onLogout={logout} />
      <main className="mx-auto max-w-md px-5 pb-12 pt-8">
        <GreenBar />
        <h1 className="mt-3 text-2xl font-black">나의 출석 QR</h1>
        {me === "error" && <p className="mt-6 text-danger">불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
        {me && typeof me === "object" && (
          <>
            <div className="mt-6 rounded-3xl border border-line p-6 text-center">
              <p className="text-xl font-black">{me.name}</p>
              <p className="mt-1 text-sm font-semibold text-muted">UID {me.uid}</p>
              <div className="mx-auto mt-5 aspect-square w-full max-w-[280px] rounded-2xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img && <img src={img} alt={`${me.name} 출석 QR 코드`} className="h-full w-full" />}
              </div>
            </div>
            <a
              href={img}
              download={`불안구독해지센터-QR-${me.uid}.png`}
              className="mt-5 block w-full rounded-2xl bg-brand py-4 text-center text-lg font-bold text-white"
            >
              QR 저장하기
            </a>
            <Link href="/my-page" className="mt-3 block w-full rounded-2xl border border-line py-3.5 text-center font-bold">출석 달력 보기</Link>

            <section className="mt-8 rounded-2xl bg-mist p-5 text-sm leading-relaxed">
              <h2 className="font-bold text-brand">출석 이용 안내</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>현장 출석 인증 카메라에 이 QR 을 보여주세요.</li>
                <li>인증되면 자동으로 출석 달력 화면으로 넘어갑니다.</li>
                <li>QR 은 본인만 사용하세요. 다른 사람에게 보내지 마세요.</li>
                <li>화면 밝기를 높이면 더 빨리 인식됩니다.</li>
              </ol>
            </section>
            <button onClick={reissue} className="mt-6 w-full text-center text-sm font-semibold text-muted underline underline-offset-4">
              QR 이 유출됐거나 휴대폰을 바꿨다면 · QR 재발급
            </button>
          </>
        )}
      </main>
    </>
  );
}
