"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
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
 * 보호자가 하교 시각을 정한다 — 🔴 **보호자 화면에서 부른다.**
 *
 * 여기서 인가를 다시 보지 않고 `childId` 를 받는 이유는, 보호자 세션 확인이
 * 보호자 화면 쪽 몫이기 때문이다. **부르는 쪽이 반드시 세션을 먼저 확인해야 한다.**
 */
export async function setSchoolEndAction(childId: string, guardianId: string, clock: string) {
  const minutes = fromClock(clock);
  if (minutes === null) return { ok: false as const, reason: "BAD_TIME" as const };

  await setSchoolEnd(childId, guardianId, minutes);
  revalidatePath("/child/home");
  return { ok: true as const };
}
