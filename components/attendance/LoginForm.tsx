"use client";
import { useState } from "react";
import { GreenBar } from "../layout/Logo";

/** 이름 + 비밀번호 본인 인증 */
export function LoginForm({ onDone }: { onDone: () => void }) {
  const [uid, setUid] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, pin }) });
      if (res.ok) return onDone();
      setError((await res.json().catch(() => ({}))).error ?? "로그인에 실패했습니다.");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-2 w-full rounded-xl border border-line px-4 py-3.5 text-base font-semibold outline-none focus:border-brand";
  return (
    <form onSubmit={submit} className="animate-pop mx-auto max-w-md px-5 pt-10">
      <GreenBar />
      <h1 className="mt-3 text-2xl font-black">본인 인증</h1>
      <p className="mt-1 text-sm text-muted">등록한 이름과 비밀번호를 입력해 주세요.</p>
      <label className="mt-8 block text-sm font-bold">
        이름
        <input className={input} value={uid} onChange={(e) => setUid(e.target.value)} autoComplete="username" placeholder="예) 김하늘" required />
      </label>
      <label className="mt-5 block text-sm font-bold">
        비밀번호
        <input className={input} value={pin} onChange={(e) => setPin(e.target.value)} type="password" autoComplete="current-password" placeholder="4자 이상" required />
      </label>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-danger">{error}</p>}
      <button disabled={busy} className="mt-8 w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white disabled:opacity-60">
        {busy ? "확인 중…" : "인증하기"}
      </button>
    </form>
  );
}
