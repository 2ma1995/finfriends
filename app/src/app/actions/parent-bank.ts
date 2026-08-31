"use server";

import { revalidatePath } from "next/cache";
import { requireGuardian } from "@/lib/session/guardian-session";
import { resetBankMock, setInterestPct, topUpMock } from "@/modules/bank";

/**
 * 아이 통장 동작 — 🔴 시연용 충전 · 이자율 설정. 어긋남 대장 D21.
 * 첫 줄에서 인가를 확인한다 (§6.6).
 */

/**
 * 🔴 **돈이 움직이지 않는다.** 시연용 잔액 숫자만 올린다.
 *    실제 충전은 제휴사 API(`requestTopUp`)가 하고 D1 이 미확정이다.
 *    금액은 정해진 세 값 중 하나만 받는다 — 모듈이 다시 검사한다.
 */
export async function topUpMockAction(formData: FormData) {
  const g = await requireGuardian();
  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
  if (Number.isFinite(amount)) await topUpMock(g.guardianId, amount);
  revalidatePath("/parent/bank");
}

/** 이자율 설정 — 저장까지만. 지급 주기가 D6 미결이라 자동 지급은 없다 */
export async function setInterestAction(formData: FormData) {
  const g = await requireGuardian();
  const pct = Number.parseInt(String(formData.get("pct") ?? ""), 10);
  if (Number.isFinite(pct)) await setInterestPct(g.guardianId, pct);
  revalidatePath("/parent/bank");
}

export async function resetBankAction() {
  const g = await requireGuardian();
  await resetBankMock(g.guardianId);
  revalidatePath("/parent/bank");
}
