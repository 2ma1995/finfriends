"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { attachPhoto, markDone, undoDone } from "@/modules/mission";

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
   * 🔴 **미션을 먼저 올리고 사진을 붙인다.** 순서가 반대면 사진 저장이 실패했을 때
   *    아이가 한 일이 통째로 사라진다. 사진은 증거지 실천 자체가 아니다.
   */
  const done = await markDone(access.childId, id);

  const file = formData.get("photo");
  if (done && file instanceof File && file.size > 0) {
    // 🔴 실패해도 미션은 이미 올라가 있다. 사진 없이 판정하면 될 뿐이다
    await attachPhoto(access.childId, id, new Uint8Array(await file.arrayBuffer()), file.type);
  }

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
