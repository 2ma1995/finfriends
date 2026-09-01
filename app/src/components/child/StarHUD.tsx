import Link from "next/link";

/**
 * 별 잔액 HUD — 아동 화면 상단 고정.
 * 별은 「확인」이 아니라 「지킴」에 붙는다. 넘겨도 빼앗지 않고, 주지 않을 뿐이다 (P-03).
 */
export function StarHUD({ balance, earned }: { balance: number; earned?: number }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-line-2 bg-star-bg px-3 py-2">
      <span className="text-sub text-ink-soft">내 별</span>
      <Link href="/child/stars" className="flex items-baseline gap-1">
        <span className={earned ? "ff-star-earn text-[1.1em]" : "text-[1.1em]"}
              style={{ textShadow: "0 0 10px var(--ff-star-glow)" }}>⭐</span>
        <b className="text-title tabular-nums text-star-d">{balance}</b>
        {earned ? <span className="text-cap font-bold text-primary">+{earned}</span> : null}
      </Link>
    </div>
  );
}
