"use client";
import { useState } from "react";
import { GreenBar, Logo } from "../layout/Logo";

export function AdminLogin({ title = "관리자 로그인", hint }: { title?: string; hint?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
    if (res?.ok) return location.reload();
    setError((await res?.json().catch(() => null))?.error ?? "네트워크 연결을 확인해 주세요.");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-mist px-5">
      <form onSubmit={submit} className="animate-pop w-full max-w-sm rounded-3xl bg-white p-8">
        <Logo className="text-2xl" />
        <GreenBar className="mt-6" />
        <h1 className="mt-3 text-xl font-black">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="관리자 비밀번호"
          aria-label="관리자 비밀번호"
          className="mt-6 w-full rounded-xl border border-line px-4 py-3.5 font-semibold outline-none focus:border-brand"
        />
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p>}
        <button className="mt-6 w-full rounded-2xl bg-brand py-3.5 font-bold text-white">로그인</button>
      </form>
    </main>
  );
}
