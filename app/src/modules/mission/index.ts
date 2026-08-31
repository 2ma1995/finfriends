import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import {
  OPEN_LIMIT, REWARD_MAX, REWARD_MIN, TITLE_MAX,
  type CreateMissionInput, type CreateMissionResult,
  type MissionBoardView, type MissionBucket, type MissionView,
} from "@/contracts/mission";

/**
 * 미션 — PRC-001 아이 쪽.
 *
 * 🔴 **아이가 하는 일은 「했어요」 하나뿐이다.** 승인은 보호자가 한다.
 *    아이가 스스로 승인할 수 있으면 이 제품의 근거(실천 인정)가 무너진다.
 *
 * 🔴 **「승인 대기」와 「미실천」을 화면에서 구별한다** (AC-6.2).
 *    같아 보이면 아이는 「했는데 왜 별이 없지」라고 느끼고, 보호자는 밀린 줄 모른다.
 */

function bucketOf(state: string, doneAt: Date | null): MissionBucket {
  if (state === "REJECTED") return "REJECTED";
  if (state === "APPROVED" || state === "BACKFILLED") return "DONE";
  return doneAt ? "WAITING" : "TODO";
}

function whenLabel(at: Date | null, now = new Date()) {
  if (!at) return null;
  const days = Math.floor((now.getTime() - at.getTime()) / 864e5);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

function toView(r: {
  id: string; title: string; topic: string; reward: number;
  state: string; doneAt: Date | null; decidedAt: Date | null; rejectReason: string | null;
}): MissionView {
  const topic = r.topic as Topic;
  const bucket = bucketOf(r.state, r.doneAt);
  return {
    id: r.id, title: r.title, topic,
    topicLabel: TOPIC_LABEL[topic], icon: TOPIC_ICON[topic],
    reward: r.reward, bucket,
    whenLabel: whenLabel(bucket === "TODO" ? null : (r.decidedAt ?? r.doneAt)),
    rejectReason: r.rejectReason,
    backfilled: r.state === "BACKFILLED",
  };
}

export async function getMissionBoard(childId: string): Promise<MissionBoardView> {
  const rows = await prisma.mission.findMany({
    where: { childId },
    orderBy: [{ state: "asc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true, title: true, topic: true, reward: true,
      state: true, doneAt: true, decidedAt: true, rejectReason: true,
    },
  });

  const views = rows.map(toView);
  return {
    todo: views.filter((v) => v.bucket === "TODO"),
    waiting: views.filter((v) => v.bucket === "WAITING"),
    settled: views.filter((v) => v.bucket === "DONE" || v.bucket === "REJECTED"),
  };
}

/** 부모 화면의 「승인 대기 N건」과 같은 값 */
export async function countWaiting(childId: string) {
  return prisma.mission.count({ where: { childId, state: "PENDING", doneAt: { not: null } } });
}

/** 주기 식별자 — 매달 초기화되는 나무의 귀속 단위 (§6.2.1) */
export function cycleIdOf(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

/**
 * 「했어요」 — 아이가 하는 유일한 조작.
 *
 * 🔴 별을 여기서 주지 않는다. **승인이 있어야 별이다** (PRC-001).
 *    여기서 주면 아이가 스스로 무한히 별을 만들 수 있다.
 * 🔴 완료 시점 주기를 **지금** 박아 둔다. 승인이 늦어도 이 주기에 귀속된다 (ACE-6.2).
 */
export async function markDone(childId: string, missionId: string) {
  const r = await prisma.mission.updateMany({
    // 이미 했거나 판정이 끝난 것은 다시 누를 수 없다
    where: { id: missionId, childId, state: "PENDING", doneAt: null },
    data: { doneAt: new Date(), cycleId: cycleIdOf() },
  });
  return r.count === 1;
}

/** 잘못 눌렀을 때 되돌리기 — 아직 보호자가 안 봤을 때만 */
export async function undoDone(childId: string, missionId: string) {
  const r = await prisma.mission.updateMany({
    where: { id: missionId, childId, state: "PENDING", doneAt: { not: null } },
    data: { doneAt: null, cycleId: null },
  });
  return r.count === 1;
}

/** 보호자 화면이 읽는 「승인 대기」 — 아이가 「했어요」를 누른 것만 올라온다 */
export async function listPendingForGuardian(guardianId: string) {
  const rows = await prisma.mission.findMany({
    where: { guardianId, state: "PENDING", doneAt: { not: null } },
    orderBy: { doneAt: "asc" },
    select: {
      id: true, title: true, topic: true, reward: true,
      state: true, doneAt: true, decidedAt: true, rejectReason: true,
    },
  });
  return rows.map(toView);
}

/**
 * 승인 — PRC-001 · PRC-002. **여기가 별이 생기는 유일한 지점이다.**
 *
 * 🔴 **늦게 승인해도 한 날짜 기준이다** (ACE-6.2). `cycleId` 는 「했어요」 때 이미 박혔고
 *    여기서 손대지 않는다. 승인 시점 주기로 옮기면 지난달 실천이 이번 달 나무를 부풀린다.
 * 🔴 멱등키는 **미션 id 하나**다. 두 번 눌러도 별은 한 번만 붙는다 (REQ-NF-006 오류율 0%).
 */
export async function approveMission(guardianId: string, missionId: string) {
  const m = await prisma.mission.findFirst({
    where: { id: missionId, guardianId, state: "PENDING", doneAt: { not: null } },
    select: { id: true, childId: true, reward: true, doneAt: true },
  });
  if (!m) return false;

  // 승인이 하루보다 늦었으면 소급으로 표시한다 — 아이 화면이 「늦게 확인됐지만」이라고 말한다
  const late = Date.now() - m.doneAt!.getTime() > 864e5;

  const granted = await grantStar({
    childId: m.childId,
    triggerCode: "MISSION_APPROVED",
    delta: m.reward,
    idempotencyKey: `mission:${m.id}`,
  });
  if (!granted.ok) return false;

  await prisma.mission.update({
    where: { id: m.id },
    data: { state: late ? "BACKFILLED" : "APPROVED", decidedAt: new Date() },
  });
  return true;
}

/**
 * 거절 — 🔴 **사유 없이 거절하지 않는다.** 아이 화면에서 「미실천」과 구별되지 않으면
 *    아이는 「했는데 왜」만 남는다 (AC-6.2). 별은 붙지 않는다.
 */
export async function rejectMission(guardianId: string, missionId: string, reason: string) {
  const r = await prisma.mission.updateMany({
    where: { id: missionId, guardianId, state: "PENDING", doneAt: { not: null } },
    data: { state: "REJECTED", decidedAt: new Date(), rejectReason: reason.trim() || null },
  });
  return r.count === 1;
}

// ─────────────────────────────────────────────────────────────
// 미션 만들기 — 보호자 쪽. §6.1 진입점 4번 `createMission`
// ─────────────────────────────────────────────────────────────

/**
 * 🔴 **미션을 만드는 사람은 보호자뿐이다.** 아이가 자기 미션을 만들 수 있으면
 *    스스로 조건을 정하고 스스로 해내는 셈이 되어 실천 인정의 근거가 사라진다
 *    (PRC-001 · 아이가 하는 일은 「했어요」 하나뿐이다).
 *
 * 🔴 `childId` 가 정말 그 보호자의 아이인지는 **호출자가 확인해 넘긴다.**
 *    이 모듈은 activity 쪽이라 identity 를 조인할 수 없다 (REQ-NF-009).
 */
export async function createMission(
  guardianId: string,
  childId: string,
  input: CreateMissionInput,
): Promise<CreateMissionResult> {
  const title = input.title.trim();
  if (title.length === 0) return { ok: false, reason: "TITLE_REQUIRED" };
  if (title.length > TITLE_MAX) return { ok: false, reason: "TITLE_TOO_LONG" };

  if (!(["EARN", "SPEND", "SAVE", "GROW"] as const).includes(input.topic)) {
    return { ok: false, reason: "TOPIC_INVALID" };
  }
  // 「불리기」는 실천 경로가 닫혀 있다. 미션을 열면 아이가 할 수 없는 일을 받는다
  if (input.topic === "GROW") return { ok: false, reason: "TOPIC_LOCKED" };

  if (!Number.isInteger(input.reward) || input.reward < REWARD_MIN || input.reward > REWARD_MAX) {
    return { ok: false, reason: "REWARD_OUT_OF_RANGE" };
  }

  // 아직 안 한 미션이 너무 많으면 아이가 무엇부터 할지 고르지 못한다
  const open = await prisma.mission.count({
    where: { childId, state: "PENDING", doneAt: null },
  });
  if (open >= OPEN_LIMIT) return { ok: false, reason: "TOO_MANY_OPEN" };

  const mission = await prisma.mission.create({
    data: {
      childId,
      guardianId,
      title,
      topic: input.topic,
      reward: input.reward,
      // 만들면 「아직 안 함」이다 — doneAt 이 null 인 PENDING
      state: "PENDING",
    },
    select: { id: true },
  });

  return { ok: true, missionId: mission.id };
}

/** 보호자 화면이 「아직 안 한 미션」을 보여줄 때 쓴다 */
export async function listOpenForGuardian(guardianId: string) {
  const rows = await prisma.mission.findMany({
    where: { guardianId, state: "PENDING", doneAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, topic: true, reward: true,
      state: true, doneAt: true, decidedAt: true, rejectReason: true,
    },
  });
  return rows.map(toView);
}
