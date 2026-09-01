"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { requireGuardian } from "@/lib/session/guardian-session";
import { issueInvite } from "@/lib/session/child-invite";

/**
 * 기기 등록 — CON-001 · 어긋남 대장 D5 · D5-b.
 *
 * 🔴 **이 액션이 「아이가 앱에 들어가는」 유일한 길이다.** 아동은 자격증명이 없으므로
 *    로그인으로는 들어올 수 없다 (REQ-NF-011 · S5).
 *
 * 🔴 부르는 사람은 **보호자뿐**이다. 첫 줄에서 인가를 확인한다 (SRS-Tech §6.6 규약 ②).
 *    이 확인이 없으면 아이 기기에서 스스로 토큰을 재발급받아 다른 아이를 열 수 있다.
 *
 * 동의 확인을 여기서도 한 번 한다 — 진입 시점 확인(`verifyChildAccess`)이 본 관문이지만,
 * 동의 전에 링크가 나가면 화면에 「등록됐다」는 잘못된 신호가 남는다.
 *
 * 🔴 **이 액션이 내는 것은 24시간짜리 1회용 초대 코드**다 (`FR-002`).
 *    기기 토큰은 `/child/enter` 가 그 코드를 교환해서 발급한다 —
 *    보호자 세션을 끝내는 것도 거기다. 기기가 실제로 아이 것이 되는 순간이 그때다.
 */
export async function registerChildDeviceAction(formData: FormData) {
  const guardian = await requireGuardian();

  const childId = String(formData.get("childId") ?? "");
  if (!childId) redirect("/parent/invite?error=" + encodeURIComponent("등록할 아이를 찾지 못했어요."));

  // 남의 아이를 등록할 수 없다. childId 는 클라이언트가 보낸 값이므로 소유를 확인한다
  const child = await prisma.childAccount.findFirst({
    where: { id: childId, guardianId: guardian.guardianId },
    select: { id: true },
  });
  if (!child) {
    redirect("/parent/invite?error=" + encodeURIComponent("등록할 아이를 찾지 못했어요."));
  }

  if (!guardian.consentCompleted) {
    redirect("/consent?error=" + encodeURIComponent("동의를 먼저 마쳐야 기기를 등록할 수 있어요."));
  }

  /**
   * 🔴 **기기 토큰을 여기서 심지 않는다.** 초대 코드를 발급하고 그 링크로 보낸다 —
   *    같은 기기든 아이 기기든 **같은 길**로 들어온다 (`AC-002-3`).
   *    길이 둘이면 한쪽만 고쳐지고, 실제로 그랬다 (`D24`).
   */
  const { token } = await issueInvite(guardian.guardianId, child.id);
  redirect(`/child/enter?t=${encodeURIComponent(token)}`);
}
