"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { markDone, undoDone } from "@/modules/mission";

/**
 * 미션 「했어요」 / 되돌리기 — PRC-001.
 *
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 * 🔴 여기서 **별을 주지 않는다.** 승인이 있어야 별이다 —
 *    아이가 스스로 별을 만들 수 있으면 실천 인정이 무의미해진다.
 */
export async function markMissionDone(formData: FormData) {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fmissions");

  const id = String(formData.get("missionId") ?? "");
  if (id) await markDone(access.childId, id);

  revalidatePath("/child/missions");
  revalidatePath("/child/home");
}

/** 잘못 눌렀을 때 — 보호자가 아직 안 봤을 때만 된다 */
export async function undoMissionDone(formData: FormData) {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fmissions");

  const id = String(formData.get("missionId") ?? "");
  if (id) await undoDone(access.childId, id);

  revalidatePath("/child/missions");
  revalidatePath("/child/home");
}
