"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { requireGuardian } from "@/lib/session/guardian-session";
import { DEVICE_COOKIE, issueDeviceToken } from "@/lib/session/device-session";
import { MODE_COOKIE } from "@/lib/session/device-mode";

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
 * 동의 전에 토큰이 나가면 화면에 「등록됐다」는 잘못된 신호가 남는다.
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

  const { token, expiresAt } = await issueDeviceToken(guardian.guardianId, child.id);

  const jar = await cookies();
  // 기기 토큰 — `/child/**` 만 연다. 보호자 권한을 전혀 갖지 않는다
  jar.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  // 모드 쿠키는 미들웨어의 1차 관문이다. 확정 판정은 서버가 `device_sessions` 로 한다
  jar.set(MODE_COOKIE, "CHILD", {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  redirect("/child/home");
}
