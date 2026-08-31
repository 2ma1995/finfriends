"use server";

import { revalidatePath } from "next/cache";
import { requireGuardian } from "@/lib/session/guardian-session";
import { revokeDevice } from "@/lib/session/device-session";
import { cancelMockCard, issueMockCard } from "@/modules/account";

/**
 * 마이페이지 동작 — 기기 해제 · 가짜 카드.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). 남의 기기를 해제할 수 없어야 한다.
 */

/**
 * 기기 해제 — 어긋남 대장 D5-b 의 「보호자 화면에서 기기 해제」.
 *
 * 🔴 `revokeDevice` 가 `guardianId` 와 함께 조회하므로 남의 기기는 매칭되지 않는다.
 *    그 아이 기기는 다음 진입에서 `REVOKED` 로 막힌다 — 쿠키가 남아 있어도 그렇다.
 */
export async function revokeDeviceAction(formData: FormData) {
  const g = await requireGuardian();
  const deviceRef = String(formData.get("deviceRef") ?? "");
  if (deviceRef) await revokeDevice(g.guardianId, deviceRef);
  revalidatePath("/parent/mypage");
  revalidatePath("/parent/onboarding");
}

/**
 * 🔴 **카드를 만들지 않는다.** 시연용 상태만 세운다 (D15).
 *    실제 발급은 제휴사(PTN-001)가 하며 D1 · D-03 이 미확정이다.
 *    이 액션은 **아무 입력도 받지 않는다** — 카드번호·실명·계좌가 들어올 자리가 없다.
 */
export async function issueMockCardAction() {
  const g = await requireGuardian();
  await issueMockCard(g.guardianId);
  revalidatePath("/parent/mypage");
  revalidatePath("/parent/onboarding");
}

export async function cancelMockCardAction() {
  const g = await requireGuardian();
  await cancelMockCard(g.guardianId);
  revalidatePath("/parent/mypage");
  revalidatePath("/parent/onboarding");
}
