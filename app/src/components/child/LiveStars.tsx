import { StarHUD } from "./StarHUD";

/** 별 잔액 — 🔴 원장의 합이다. 화면이 따로 세지 않는다 (REQ-NF-006) */
export function LiveStars({ balance }: { balance: number }) {
  return <StarHUD balance={balance} />;
}
