"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { attachPhoto, findForPhoto, markDone, undoDone } from "@/modules/mission";
import { needsPhoto } from "@/contracts/mission";

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

  const file = formData.get("photo");
  const hasFile = file instanceof File && file.size > 0;

  /**
   * 🔴 **벌기 부모 미션만 사진이 필수다** (D49 · 사용자 결정).
   *    집안일·심부름은 **앱이 볼 수 없다** — 사진이 유일한 증거다.
   *    잘 쓰기는 카드 내역이, 모으기는 통장이, 불리기는 적금 회차가 답한다.
   *
   * 🔴 **필수인 건 올리기 전에 본다.** 올린 뒤에 막으면 아이가 한 일이
   *    「기다리는 중」에 사진 없이 남고, 부모는 판정할 근거가 없다.
   */
  const m = await findForPhoto(access.childId, id);
  if (m && needsPhoto(m.topic, m.fromLesson) && !hasFile) {
    redirect("/child/missions?photo=NEED");
  }

  /**
   * 🔴 **미션을 먼저 올리고 사진을 붙인다.** 순서가 반대면 사진 저장이 실패했을 때
   *    아이가 한 일이 통째로 사라진다. 사진은 증거지 실천 자체가 아니다.
   */
  const done = await markDone(access.childId, id);

  if (done && hasFile) {
    // 🔴 실패해도 미션은 이미 올라가 있다. 부모가 사진 없이 판정하면 될 뿐이다
    await attachPhoto(access.childId, id, new Uint8Array(await file.arrayBuffer()), file.type);
  }

  revalidatePath("/child/missions");
  revalidatePath("/child/home");
  revalidatePath("/child/practice");
}

/**
 * 완료 **뒤에** 사진을 붙인다 — `FR-032`.
 *
 * 🔴 **예전엔 이 길이 없었다.** 사진칸이 「했어요」 버튼과 같은 폼에만 있어서,
 *    한 번 누르고 나면 붙일 방법이 **아예 없었다.** 아이는 하고 나서 찍는다 —
 *    누르기 전에 찍어 두라는 건 어른의 순서다.
 *
 * 🔴 `attachPhoto` 가 **판정 전(PENDING)인지 다시 본다.** 부모가 이미 본 미션에
 *    사진이 새로 붙으면 판정 근거가 뒤에서 바뀐다.
 */
export async function attachMissionPhoto(formData: FormData) {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fmissions");

  const id = String(formData.get("missionId") ?? "");
  const file = formData.get("photo");
  if (!id || !(file instanceof File) || file.size === 0) redirect("/child/missions");

  const r = await attachPhoto(access.childId, id, new Uint8Array(await file.arrayBuffer()), file.type);

  revalidatePath("/child/missions");
  // 🔴 실패를 조용히 넘기지 않는다. 아이는 「올라갔겠지」로 넘어가면 안 된다
  if (!r.ok) redirect(`/child/missions?photo=${r.reason}`);
  redirect("/child/missions?photo=ok");
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
