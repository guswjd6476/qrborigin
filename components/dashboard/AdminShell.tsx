"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GreenBar, Logo } from "../layout/Logo";

export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) location.reload();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data;
}

const NAV = [
  ["/admin", "대시보드"],
  ["/admin/programs", "프로그램·일정"],
  ["/check-in", "출석 인증 키오스크"],
] as const;

export function AdminShell({ title, demo, children }: { title: string; demo?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    location.reload();
  }
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <Logo className="text-xl" />
          <nav className="flex gap-1 overflow-x-auto text-sm font-bold">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className={`whitespace-nowrap rounded-full px-4 py-2 ${path === href ? "bg-brand text-white" : "text-muted hover:bg-mist"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="ml-auto whitespace-nowrap text-sm font-semibold text-muted">로그아웃</button>
        </div>
      </header>
      {demo && <div className="bg-sprout py-1.5 text-center text-xs font-semibold text-leaf-deep">데모 모드 · 메모리 DB (서버를 다시 켜면 초기화)</div>}
      <main className="mx-auto max-w-6xl px-5 py-8">
        <GreenBar />
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export const card = "rounded-2xl border border-line";
export const input = "rounded-xl border border-line px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand";
export const btn = "rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";
export const btnGhost = "rounded-xl border border-line px-3 py-2 text-xs font-bold hover:bg-mist";
