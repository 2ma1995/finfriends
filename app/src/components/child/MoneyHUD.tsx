import Link from "next/link";

/**
 * 아이 화면 상단 — **별과 용돈을 나란히** 둔다.
 *
 * 🔴 **둘은 다른 것이다.** 별은 방 꾸미기에만 쓰고, 용돈은 실제 돈이다.
 *    서로 바꿀 수 없다 (P-21). 그래서 합치지 않고 **나란히** 둔다 —
 *    한 칸에 합치면 아이는 하나의 지갑으로 이해한다.
 *
 * 🔴 통장이 계획 카드 안에만 있어서 **아이가 찾을 수 없었다.**
 *    첫 화면에서 보이지 않는 것은 없는 것과 같다.
 */
export function MoneyHUD({ stars, allowance, earned }: {
  stars: number; allowance: number; earned?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Link href="/child/stars"
            className="flex items-center justify-between rounded-card border border-line-2 bg-star-bg px-3 py-2">
        <span className="text-[0.74em] text-ink-soft">내 별</span>
        <span className="flex items-baseline gap-1">
          <span className={earned ? "ff-star-earn text-[1em]" : "text-[1em]"}
                style={{ textShadow: "0 0 10px var(--ff-star-glow)" }}>⭐</span>
          <b className="text-[1.15em] tabular-nums text-star-d">{stars}</b>
          {earned ? <span className="text-[0.7em] font-bold text-primary">+{earned}</span> : null}
        </span>
      </Link>

      <Link href="/child/allowance"
            className="flex items-center justify-between rounded-card border border-line-2 bg-sand px-3 py-2">
        <span className="text-[0.74em] text-ink-soft">내 통장</span>
        <b className="text-[1.05em] tabular-nums">{allowance.toLocaleString("ko-KR")}<span className="text-[0.7em] font-normal">원</span></b>
      </Link>
    </div>
  );
}
