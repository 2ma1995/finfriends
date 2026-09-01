import { revalidatePath } from "next/cache";

/**
 * 돈이 바뀔 때 되살릴 화면들.
 *
 * 🔴 **한 곳에 모아 둔다.** 액션마다 손으로 적었더니 `/child/home` 이 빠졌다 —
 *    아이 홈의 돈 HUD 가 나중에 생겼는데 목록은 그 전에 쓴 것이었다.
 *    그래서 부모가 충전해도 **아이 첫 화면의 숫자는 그대로**였다.
 *
 * 🔴 액션 파일 안에 두면 다른 액션이 못 쓴다. 실제로 적금 액션이 못 썼다.
 *    **화면을 새로 만들 때 여기에 한 줄 더한다.**
 */
export const MONEY_PATHS = [
  "/parent/bank",
  "/parent/bank/savings", // 적금 신청·진행
  "/child/home",          // 돈 HUD
  "/child/welcome",       // 첫 진입에서도 잔액을 보여준다
  "/child/allowance",     // 아이 통장
  "/child/wishlist",      // 목표에 넣을 수 있는 금액이 바뀐다
  // 🔴 봉투·저금·기입장이 모두 통장 한 화면에 있다 — 돈 화면은 여기 하나다
] as const;

/** 별까지 움직였을 때 — 적금 가입·만기는 ⭐가 함께 나간다 */
export const STAR_PATHS = ["/child/stars", "/child/shop"] as const;

export const revalidateMoney = () => MONEY_PATHS.forEach((p) => revalidatePath(p));
export const revalidateMoneyAndStars = () =>
  [...MONEY_PATHS, ...STAR_PATHS].forEach((p) => revalidatePath(p));
