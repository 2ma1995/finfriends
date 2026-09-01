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
  revalidatePath("/parent/bank/missions");
  revalidatePath("/child/missions");
}

export async function rejectMissionAction(formData: FormData) {
  const g = await requireGuardian();
  const id = String(formData.get("missionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  /**
   * 🔴 **사유 없이 거절하지 않는다** (`AC-6.2`).
   *    사유가 없으면 아이 화면에서 **「미실천」과 구별되지 않고**,
   *    아이에게는 「했는데 왜」만 남는다.
   *
   * 🔴 입력칸에 `required` 를 걸 수 없다 — 「칭찬하기」와 같은 폼이라 승인까지 막힌다.
   *    그래서 여기서 막고 **그 카드로 돌려보낸다.**
   */
  if (id && reason.length === 0) redirect(`/parent/bank/missions?needReason=${id}`);

  if (id) await rejectMission(g.guardianId, id, reason);
  revalidatePath("/parent/bank/missions");
  revalidatePath("/child/missions");
  redirect("/parent/bank/missions");
}

/** 일괄 승인 — PRC-003. 한 건씩 돌린다. 멱등키가 미션 id 라 중복은 그냥 무시된다 */
export async function approveAllAction(formData: FormData) {
  const g = await requireGuardian();
  const ids = String(formData.get("missionIds") ?? "").split(",").filter(Boolean);
  for (const id of ids) await approveMission(g.guardianId, id);
  revalidatePath("/parent/bank/missions");
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
  // 🔴 ⭐는 REQ-FUNC-002 가 1로 못박았다. 보호자가 정하는 것은 **금액**이다
  const reward = 1;
  const payoutWon = Number.parseInt(String(formData.get("payoutWon") ?? "0"), 10) || 0;

  const result = await createMission(g.guardianId, child.id, { title, topic, reward, payoutWon });

  if (!result.ok) {
    const q = new URLSearchParams({
      error: CREATE_MISSION_MESSAGES[result.reason],
      title,
      payoutWon: String(payoutWon),
    });
    redirect(`/parent/bank/missions/new?${q}`);
  }

  revalidatePath("/parent/bank/missions");
  revalidatePath("/parent/tree");
  revalidatePath("/child/missions");
  // 🔴 승인하면 용돈이 들어간다 — 돈 화면도 되살린다
  revalidatePath("/child/practice");
  redirect("/parent/bank/missions?created=1");
}
