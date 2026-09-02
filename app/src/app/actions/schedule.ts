"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { currentChild } from "@/lib/session/current-child";
import { requireGuardian } from "@/lib/session/guardian-session";
import { markAsked, setSchoolEnd, fromClock } from "@/modules/schedule";

/**
 * 「오늘은 계획 없어요」 — 오늘은 다시 묻지 않는다.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). Server Action 은 공개 엔드포인트와 동등하다.
 */
export async function dismissPlanAskAction() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fhome");

  await markAsked(access.childId);
  revalidatePath("/child/home");
}

/**
 * 보호자가 하교 시각을 정한다 — PLN-001 곁 · 어긋남 대장 D39.
 *
 * 🔴 **첫 줄에서 인가를 확인한다** (SRS-Tech §6.6 규약 ②). 한동안 `guardianId` 를
 *    인자로 받고 「부르는 쪽이 봤겠지」로 뒀다. **Server Action 은 주소만 알면
 *    호출되는 공개 엔드포인트다** — 화면이 막아도 액션 자체는 열려 있었다.
 *
 * 🔴 **`childId` 는 클라이언트가 보낸 값이다.** 소유를 확인하지 않으면
 *    남의 아이 하교 시각을 바꿀 수 있다 (`createInviteLinkAction` 과 같은 이유).
 *    보호자는 **세션에서** 오고, 아이는 **그 보호자 밑에서** 찾는다.
 */
export async function setSchoolEndAction(childId: string, clock: string) {
  const guardian = await requireGuardian();

  const minutes = fromClock(clock);
  if (minutes === null) return { ok: false as const, reason: "BAD_TIME" as const };

  const child = await prisma.childAccount.findFirst({
    where: { id: childId, guardianId: guardian.guardianId },
    select: { id: true },
  });
  if (!child) return { ok: false as const, reason: "NOT_MINE" as const };

  await setSchoolEnd(childId, guardian.guardianId, minutes);
  revalidatePath("/child/home");
  return { ok: true as const };
}
