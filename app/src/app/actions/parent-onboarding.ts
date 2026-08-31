"use server";

import { redirect } from "next/navigation";
import { CHILD_PROFILE_MESSAGES, type DeviceTypeValue } from "@/contracts/child";
import { createChildProfile } from "@/modules/consent";
import { requireGuardian } from "@/lib/session/guardian-session";

/**
 * 보호자 온보딩 단계 저장 — §6.1 진입점 2번 `saveOnboardingStep` (consent 모듈).
 *
 * 파일 이름에 `parent-` 가 붙은 이유 — `actions/onboarding.ts` 는 **아이** 온보딩
 * (첫 진입 튜토리얼 · D13)이 쓴다. 행위자가 다르면 인가도 다르다:
 * 여기는 `requireGuardian`, 저쪽은 `currentChild` 다. 한 파일에 두면 경계가 흐려진다.
 * 표에 있는 진입점이므로 어긋남이 아니다.
 *
 * 🔴 첫 줄에서 인가를 확인한다. 남의 계정에 아이를 붙이는 호출이 들어올 수 있다
 *    (SRS-Tech §6.6 규약 ②).
 */
export async function saveChildProfileAction(formData: FormData) {
  const guardian = await requireGuardian();

  const displayName = String(formData.get("displayName") ?? "");
  const birthYearRaw = String(formData.get("birthYear") ?? "");
  const deviceRaw = String(formData.get("deviceType") ?? "");

  const result = await createChildProfile(guardian.guardianId, {
    displayName,
    birthYear: Number.parseInt(birthYearRaw, 10),
    // 빈 값을 null 로 바꾸지 않는다 — 모듈이 「고르지 않음」으로 거부해야 한다
    deviceType: (deviceRaw || null) as DeviceTypeValue | null,
  });

  if (!result.ok) {
    // 동의가 빠진 것이면 고칠 곳은 이 화면이 아니다
    if (result.reason === "CONSENT_REQUIRED") redirect("/consent");

    const q = new URLSearchParams({
      error: CHILD_PROFILE_MESSAGES[result.reason],
      name: displayName,
      year: birthYearRaw,
    });
    redirect(`/parent/child/new?${q}`);
  }

  // 아이가 생겼으니 다음은 그 아이의 기기를 등록하는 일이다 (4단계)
  redirect("/parent/invite");
}
