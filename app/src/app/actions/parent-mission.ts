"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/session/guardian-session";
import { approveMission, createMission, rejectMission } from "@/modules/mission";
import { findChild } from "@/modules/consent";
import { CREATE_MISSION_MESSAGES } from "@/contracts/mission";
import type { Topic } from "@/contracts/learning";

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

/**
 * 미션 만들기 — §6.1 진입점 4번 `createMission`. 표에 있는 진입점이다.
 *
 * 🔴 `childId` 를 폼에서 받지 않는다. 세션의 보호자로부터 **서버가 찾는다** —
 *    받으면 남의 아이에게 미션을 꽂는 호출이 가능해진다.
 */
export async function createMissionAction(formData: FormData) {
  const g = await requireGuardian();

  const child = await findChild(g.guardianId);
  if (!child) redirect("/parent/child/new");

  const title = String(formData.get("title") ?? "");
  const topic = String(formData.get("topic") ?? "") as Topic;
  const reward = Number.parseInt(String(formData.get("reward") ?? ""), 10);

  const result = await createMission(g.guardianId, child.id, { title, topic, reward });

  if (!result.ok) {
    const q = new URLSearchParams({
      error: CREATE_MISSION_MESSAGES[result.reason],
      title,
      topic: topic ?? "",
      reward: Number.isNaN(reward) ? "" : String(reward),
    });
    redirect(`/parent/missions/new?${q}`);
  }

  revalidatePath("/parent/missions");
  revalidatePath("/parent/tree");
  revalidatePath("/child/missions");
  redirect("/parent/missions?created=1");
}
