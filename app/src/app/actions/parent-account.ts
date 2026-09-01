"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GUARDIAN_COOKIE, requireGuardian } from "@/lib/session/guardian-session";
import { DEVICE_COOKIE, revokeDevice } from "@/lib/session/device-session";
import { MODE_COOKIE } from "@/lib/session/device-mode";
import { advanceMockCard, resetMockCard, withdrawAccount } from "@/modules/account";

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
 * 🔴 **카드를 만들지 않는다.** 다음 단계로만 옮긴다 (D20).
 *    실제 발급은 제휴사(PTN-001)가 하며 D1 · D-03 이 미확정이다.
 *
 * 🔴 이 액션은 **아무 입력도 받지 않는다.** 카드번호·유효기간·CVC·실명·주민번호·계좌가
 *    들어올 자리가 구조적으로 없다. 본인확인도 제휴사에 위임된다(D-03 · ADR-T09).
 */
export async function advanceMockCardAction() {
  const g = await requireGuardian();
  await advanceMockCard(g.guardianId);
  revalidatePath("/parent/card");
  revalidatePath("/parent/mypage");
  revalidatePath("/parent/onboarding");
}

/** 시연을 다시 처음부터 보여줄 때 */
export async function resetMockCardAction() {
  const g = await requireGuardian();
  await resetMockCard(g.guardianId);
  revalidatePath("/parent/card");
  revalidatePath("/parent/mypage");
  revalidatePath("/parent/onboarding");
}

/**
 * 🔴 **탈퇴 — 되돌릴 수 없다** (`FR-041` · 어긋남 대장 D36).
 *
 * 🔴 **확인을 서버가 다시 본다.** 체크박스는 화면 검사일 뿐이고 Server Action 은
 *    공개 엔드포인트와 동등하다 (§6.6 규약 ②). 폼을 우회한 호출로 계정이 지워지면 안 된다.
 *
 * 🔴 **쿠키를 함께 지운다.** 계정이 사라졌는데 세션 쿠키가 남으면 다음 요청이
 *    없는 보호자를 찾다가 이상한 화면으로 떨어진다. 아이 기기 쿠키도 같이 지운다 —
 *    같은 브라우저에 남아 있으면 지워진 아이를 계속 가리킨다.
 */
export async function withdrawAction(formData: FormData) {
  const g = await requireGuardian();

  if (String(formData.get("confirm") ?? "") !== "yes") {
    redirect("/parent/mypage/withdraw?error=CONFIRM");
  }

  const r = await withdrawAccount(g.guardianId);
  if (!r.ok) redirect("/parent/mypage/withdraw?error=FAILED");

  const jar = await cookies();
  jar.delete(GUARDIAN_COOKIE);
  jar.delete(DEVICE_COOKIE);
  jar.delete(MODE_COOKIE);

  redirect("/login?left=1");
}
