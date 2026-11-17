"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";

export function MobileHeader({ onLogout }: { onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
        <Link href="/my-page">
          <Logo />
        </Link>
        <button aria-label="메뉴" aria-expanded={open} onClick={() => setOpen(!open)} className="-mr-2 grid h-10 w-10 place-items-center rounded-full hover:bg-mist">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
      {open && (
        <nav className="animate-fade mx-auto max-w-md border-t border-line px-5 py-2 text-[15px] font-semibold">
          <Link className="block py-3" href="/my-page" onClick={() => setOpen(false)}>마이페이지 · 출석 달력</Link>
          <Link className="block py-3" href="/my-qr" onClick={() => setOpen(false)}>나의 출석 QR</Link>
          {onLogout && (
            <button className="block w-full py-3 text-left text-muted" onClick={onLogout}>로그아웃</button>
          )}
        </nav>
      )}
    </header>
  );
}
