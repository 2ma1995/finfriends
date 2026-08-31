"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/session/guardian-session";
import { approveMission, rejectMission } from "@/modules/mission";

/**
 * 미션 승인 / 거절 — PRC-001 · PRC-002.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). 보호자만 판정한다.
 */
export async function approveMissionAction(formData: FormData) {
  const g = await requireGuardian();
  const id = String(formData.get("missionId") ?? "");
  if (id) await approveMission(g.guardianId, id);
  revalidatePath("/parent/missions");
  revalidatePath("/child/missions");
}

export async function rejectMissionAction(formData: FormData) {
  const g = await requireGuardian();
  const id = String(formData.get("missionId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (id) await rejectMission(g.guardianId, id, reason);
  revalidatePath("/parent/missions");
  revalidatePath("/child/missions");
}

/** 일괄 승인 — PRC-003. 한 건씩 돌린다. 멱등키가 미션 id 라 중복은 그냥 무시된다 */
export async function approveAllAction(formData: FormData) {
  const g = await requireGuardian();
  const ids = String(formData.get("missionIds") ?? "").split(",").filter(Boolean);
  for (const id of ids) await approveMission(g.guardianId, id);
  revalidatePath("/parent/missions");
  revalidatePath("/child/missions");
}

export async function goHome() {
  redirect("/parent/tree");
}
