"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { advanceTour, finishTour, restartTour, skipTour } from "@/modules/onboarding";

/**
 * 아이 온보딩 — 어긋남 대장 D13.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 * 🔴 넘어갈 단계를 요청이 정하지만 **모듈이 한 칸으로 깎는다** — 마지막 장으로
 *    뛰어 별만 받아 가는 길을 막는다.
 */
export async function advanceTourAction(formData: FormData) {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fwelcome");

  const to = Number(formData.get("to") ?? 0) || 0;
  const at = await advanceTour(access.childId, to);
  redirect(`/child/welcome?step=${at}`);
}

export async function finishTourAction() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fwelcome");

  const r = await finishTour(access.childId);
  revalidatePath("/child/home");
  // 아직 마지막 장이 아니면 그대로 둔다 — 조용히 되돌린다
  redirect(r.ok && r.firstTime ? "/child/home?welcome=1" : "/child/home");
}

export async function skipTourAction() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fwelcome");

  await skipTour(access.childId);
  revalidatePath("/child/home");
  redirect("/child/home");
}

/** 홈에서 다시 보기 */
export async function restartTourAction() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fhome");

  await restartTour(access.childId);
  redirect("/child/welcome?step=0");
}
