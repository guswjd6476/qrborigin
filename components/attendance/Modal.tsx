"use client";
import { useEffect } from "react";

export const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** 어두운 배경 + 중앙 흰 모달 */
export function Modal({
  tone = "success",
  title,
  body,
  rows = [],
  onClose,
  extra,
}: {
  tone?: "success" | "info";
  title: string;
  body: string;
  rows?: [string, string][];
  onClose: () => void;
  extra?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-navy/60 px-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="animate-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center" onClick={(e) => e.stopPropagation()}>
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${tone === "success" ? "bg-leaf text-white" : "bg-mist text-brand"}`}>
          {tone === "success" ? <CheckIcon size={32} /> : <span className="text-3xl font-black">!</span>}
        </div>
        <h2 id="modal-title" className="mt-5 text-2xl font-black">{title}</h2>
        <p className="mt-2 text-[15px] text-muted">{body}</p>
        {rows.length > 0 && (
          <dl className="mt-5 divide-y divide-line rounded-2xl border border-line text-left text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <button autoFocus onClick={onClose} className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white">확인</button>
        {extra}
      </div>
    </div>
  );
}
