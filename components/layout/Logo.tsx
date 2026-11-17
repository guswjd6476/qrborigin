/** 텍스트 워드마크. 실제 로고 파일이 생기면 이 컴포넌트만 바꾸면 된다. */
export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight text-brand ${className}`}>
      불안구독해지센터
    </span>
  );
}

/** 브랜드 포인트: 짧은 그린 바 */
export const GreenBar = ({ className = "" }: { className?: string }) => <span className={`block h-1 w-8 rounded-full bg-leaf ${className}`} />;

export const DemoBadge = () => (
  <div className="bg-sprout px-4 py-1.5 text-center text-xs font-semibold text-leaf-deep">데모 모드 · 메모리 DB (서버를 다시 켜면 초기화)</div>
);
