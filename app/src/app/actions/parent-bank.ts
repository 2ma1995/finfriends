"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/session/guardian-session";
import { findChild } from "@/modules/consent";
import { reverseEntry } from "@/modules/allowance";
import { setInterestPct, topUpAllowance } from "@/modules/bank";

/**
 * 아이 통장(보호자용) 동작 — 어긋남 대장 D21.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). Server Action 은 공개 엔드포인트와 동등하다.
 */

/**
 * 돈이 바뀌면 다시 그려야 하는 화면 전부.
 *
 * 🔴 **한 곳에 모아 둔다.** 이 목록을 액션마다 손으로 적었더니 `/child/home` 이 빠졌다 —
 *    아이 홈의 돈 HUD 가 나중에 생겼는데 목록은 그 전에 쓴 것이었다.
 *    그래서 부모가 충전해도 **아이 첫 화면의 숫자는 그대로**였다.
 *    화면을 새로 만들 때 여기에 한 줄 더한다.
 */
const MONEY_PATHS = [
  "/parent/bank",
  "/child/home",      // 돈 HUD
  "/child/welcome",   // 첫 진입에서도 잔액을 보여준다
  "/child/allowance", // 아이 통장
  "/child/wishlist",  // 목표에 넣을 수 있는 금액이 바뀐다
  "/child/plan",      // 계획 세울 때 쓸 수 있는 돈이 바뀐다
] as const;

const revalidateMoney = () => MONEY_PATHS.forEach((p) => revalidatePath(p));

/**
 * 용돈 넣기 — 🔴 **용돈 원장에 적는다.** 시연용 컬럼을 올리던 것을 바꿨다.
 *    컬럼에 두면 아이 화면(원장을 본다)과 숫자가 갈려
 *    「부모가 넣었는데 아이한테 안 보인다」가 난다.
 *
 * 🔴 돈이 움직이지는 않는다 (D18). 실제 돈은 현금·부모 카드로 앱 밖에서 오간다.
 * 🔴 아이는 **내 아이여야 한다.** 세션의 보호자로부터 아이를 찾는다 —
 *    폼에서 childId 를 받으면 남의 아이 통장에 적을 수 있다.
 */
export async function topUpMockAction(formData: FormData) {
  const g = await requireGuardian();
  const child = await findChild(g.guardianId);
  if (!child) redirect("/parent/bank?error=NO_CHILD");

  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
  const r = await topUpAllowance(child.id, Number.isFinite(amount) ? amount : 0);

  // 아이 화면이 같은 원장을 본다 — 넣자마자 보여야 한다
  revalidateMoney();

  redirect(r.ok ? "/parent/bank?saved=1" : "/parent/bank?error=BAD_AMOUNT");
}

/**
 * 잘못 적은 줄 되돌리기 — D18.
 * 🔴 **줄을 고치거나 지우지 않는다.** 상쇄하는 줄을 새로 적는다 —
 *    고치면 「합이 잔액」이 깨지고 왜 이렇게 됐는지 아무도 못 본다.
 */
export async function reverseEntryAction(formData: FormData) {
  const g = await requireGuardian();
  const child = await findChild(g.guardianId);
  if (!child) redirect("/parent/bank?error=NO_CHILD");

  const r = await reverseEntry(
    child.id,
    String(formData.get("entryId") ?? ""),
    String(formData.get("reason") ?? ""),
  );

  revalidateMoney();

  if (!r.ok) redirect(`/parent/bank?fix=${r.reason}`);
  // 🔴 얼마가 왜 안 돌아왔는지 그대로 말한다
  redirect(`/parent/bank?fixed=${r.reversed}${r.short > 0 ? `&short=${r.short}` : ""}`);
}

/** 이자율 설정 — 저장까지만. 지급 주기가 D6 미결이라 자동 지급은 없다 */
export async function setInterestAction(formData: FormData) {
  const g = await requireGuardian();
  const pct = Number.parseInt(String(formData.get("pct") ?? ""), 10);
  if (Number.isFinite(pct)) await setInterestPct(g.guardianId, pct);
  revalidatePath("/parent/bank");
}
