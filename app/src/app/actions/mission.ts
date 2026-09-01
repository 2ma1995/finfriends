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
  if (!id) redirect("/child/missions");

  /**
   * 🔴 사진은 **선택**이다 (FR-032). 없어도 미션은 올라간다 —
   *    필수로 하면 찍을 수 없는 실천(참기·기록하기)은 아예 못 올린다.
   *
   * ⚠️ 저장은 `modules/mission.attachPhoto` 가 맡는다(다른 작업자). 붙기 전까지는
   *    **화면만 준비돼 있고 사진은 저장되지 않는다.** 아이에게 「지워진다」고
   *    말해 놓고 저장하는 것보다, 아예 저장하지 않는 쪽이 안전하다.
   */
  await markDone(access.childId, id);

  revalidatePath("/child/missions");
  revalidatePath("/child/home");
  revalidatePath("/child/practice");
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
