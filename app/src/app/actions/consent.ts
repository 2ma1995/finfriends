"use server";

import { redirect } from "next/navigation";
import { CONSENT_ITEMS, type ConsentItemKey } from "@/contracts/consent";
import { completeConsent, withdrawConsent } from "@/modules/consent";
import { requireGuardian } from "@/lib/session/guardian-session";

/**
 * 동의 게이트 — §6.1 진입점 1번 `completeConsent` (consent 모듈).
 * 표에 있는 진입점이므로 어긋남이 아니다.
 *
 * 🔴 폼이 보낸 항목만 인정한다. 체크되지 않은 체크박스는 FormData 에 **들어오지 않는다** —
 *    그러니 「없으면 동의 안 한 것」이 자연스럽게 성립한다.
 *    화면의 `required` 속성은 편의일 뿐이고, 판정은 여기와 모듈이 한다.
 */
export async function completeConsentAction(formData: FormData) {
  const guardian = await requireGuardian();

  const accepted = CONSENT_ITEMS
    .map((i) => i.key)
    .filter((key): key is ConsentItemKey => formData.get(key) === "on");

  const result = await completeConsent(guardian.guardianId, accepted);

  if (!result.ok) {
    const q = new URLSearchParams({ error: "필수 항목에 모두 동의해야 시작할 수 있어요." });
    redirect(`/consent?${q}`);
  }

  // 동의가 끝나면 온보딩으로. 아이 정보는 여기서부터 받는다 (P-05 · P-22)
  redirect("/parent/onboarding");
}

/**
 * 철회. 되돌릴 수 없는 동의는 동의가 아니다.
 * 철회하면 아이 화면이 **다음 진입에서 즉시 막힌다** — 토큰이 살아 있어도 그렇다.
 */
export async function withdrawConsentAction() {
  const guardian = await requireGuardian();
  await withdrawConsent(guardian.guardianId);
  redirect("/consent");
}
