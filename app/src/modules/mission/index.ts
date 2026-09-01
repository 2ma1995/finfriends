import "server-only";
import { prisma } from "@/db";
import { relativeWhen } from "@/lib/when";
import { sendToGuardian } from "@/lib/push";
import { grantStar } from "@/modules/star-ledger";
import { record as recordAllowance } from "@/modules/allowance";
import { findLesson } from "@/contracts/lessons";
import { isPracticeOpen } from "@/contracts/learning";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { kstDay } from "@/modules/attendance";

/** KST 오늘의 시작을 UTC 로 — 서버가 어디서 돌든 아이가 사는 하루의 경계다 */
function kstDayStart(now = new Date()) {
  return new Date(Date.parse(`${kstDay(now)}T00:00:00.000Z`) - 9 * 60 * 60 * 1000);
}

/** 이 영역에서 오늘 이미 실천을 올렸나 — 화면과 서버가 같은 답을 낸다 */
export async function practicedToday(childId: string, topic: Topic, now = new Date()) {
  const n = await prisma.mission.count({
    where: { childId, topic, sourceId: { not: null }, doneAt: { gte: kstDayStart(now) } },
  });
  return n > 0;
}
import {
  OPEN_LIMIT, REWARD_MAX, REWARD_MIN, TITLE_MAX,
  PAYOUT_MAX,
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
  // 🔴 `EXPIRED` 는 더 만들지 않는다. 옛 데이터가 남아 있어 분기는 유지한다 (D51)
  if (state === "EXPIRED") return "EXPIRED";
  // 🔴 자동 완료도 **완료**다 — 별이 나갔으니 아이에게는 끝난 일이다
  if (state === "APPROVED" || state === "BACKFILLED" || state === "AUTO_APPROVED") return "DONE";
  return doneAt ? "WAITING" : "TODO";
}

/** 🔴 아직 안 한 것은 날짜가 없다 — `null` 을 그대로 흘린다 */
function whenLabel(at: Date | null, now = new Date()) {
  return at ? relativeWhen(at, now) : null;
}

function toView(r: {
  id: string; title: string; topic: string; reward: number; payoutWon: number;
  state: string; doneAt: Date | null; decidedAt: Date | null; rejectReason: string | null;
  sourceId?: string | null;
}, withPhoto = new Set<string>()): MissionView {
  const topic = r.topic as Topic;
  const bucket = bucketOf(r.state, r.doneAt);
  return {
    id: r.id, title: r.title, topic,
    topicLabel: TOPIC_LABEL[topic], icon: TOPIC_ICON[topic],
    reward: r.reward, payoutWon: r.payoutWon, bucket,
    whenLabel: whenLabel(bucket === "TODO" ? null : (r.decidedAt ?? r.doneAt)),
    rejectReason: r.rejectReason,
    backfilled: r.state === "BACKFILLED",
    /**
     * 🔴 **부모가 칭찬한 것과 시간이 지나 완료된 것은 다른 말이다** (D51).
     *    아이 화면이 구별해 말할 수 있게 값을 낸다 — 쓸지는 그 화면이 정한다.
     */
    autoDone: r.state === "AUTO_APPROVED",
    fromLesson: r.sourceId != null,
    /**
     * 🔴 **늘 `false` 로 박혀 있었다.** 아이가 사진을 올렸는지 화면이 알 길이 없어서
     *    「올라갔나?」 싶으면 다시 올리는 것 말고는 확인할 방법이 없었다.
     *
     * 🔴 **조인이 아니라 따로 센다.** `mission_photos` 는 `mission_id` 만 갖고
     *    Prisma 관계가 없다 — 관계를 걸면 FK 가 생기고 마이그레이션이 필요하다.
     *    `bytes` 를 절대 안 읽는 것도 중요하다. 목록에 사진 원본이 딸려 오면 안 된다.
     */
    hasPhoto: withPhoto.has(r.id),
  };
}

export async function getMissionBoard(childId: string): Promise<MissionBoardView> {
  /**
   * 🔴 **아이 화면에서도 만료를 처리한다.**
   *
   *    승인 화면에서만 돌게 두면 **부모가 안 열면 영원히 안 끝난다** —
   *    그런데 끝나기를 기다리는 사람은 아이다. 「기다리는 중」이 끝없이 떠 있는 것을
   *    보는 쪽에서 끝나야 한다.
   *
   *    🔴 리마인드도 여기서 남긴다. 부모가 앱을 안 열어도 **알림은 쌓여 있어야** 한다 —
   *    부모가 열었을 때 「그동안 이런 일이 있었다」를 보여주는 것이 알림함의 값이다.
   *
   *    `pg_cron` 이 붙으면 배치가 부르고 이 줄은 사라져도 된다 (`ADR-T02`).
   */
  await autoCompleteStaleMissions({ childId });
  await remindStaleMissions({ childId });

  const rows = await prisma.mission.findMany({
    where: { childId },
    orderBy: [{ state: "asc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true, title: true, topic: true, reward: true, payoutWon: true,
      state: true, doneAt: true, decidedAt: true, rejectReason: true, sourceId: true,
    },
  });

  // 🔴 id 만 가져온다 — `bytes` 를 목록에서 읽으면 사진 원본이 통째로 딸려 온다
  const shots = await prisma.missionPhoto.findMany({
    where: { missionId: { in: rows.map((r) => r.id) } },
    select: { missionId: true },
  });
  const withPhoto = new Set(shots.map((s) => s.missionId));

  const views = rows.map((r) => toView(r, withPhoto));
  return {
    todo: views.filter((v) => v.bucket === "TODO"),
    waiting: views.filter((v) => v.bucket === "WAITING"),
    /**
     * 🔴 **만료된 것도 여기 넣는다.** 빼면 아이 화면에서 **그냥 사라진다** —
     *    아이는 「했어요」를 눌렀는데 그 미션이 없어진 것을 보게 되고,
     *    무슨 일이 있었는지 알 방법이 없다.
     *
     *    `AC-032-3` 이 요구하는 것은 **「확인하지 못했어요」가 표시되는 것**이다.
     *    사라지는 것은 그 요구와 반대다.
     */
    settled: views.filter(
      (v) => v.bucket === "DONE" || v.bucket === "REJECTED" || v.bucket === "EXPIRED",
    ),
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
    data: {
      doneAt: new Date(), cycleId: cycleIdOf(),
    },
  });
  if (r.count !== 1) return false;

  /**
   * 🔴 **바로 알린다** (어긋남 대장 D52).
   *    24시간을 기다리면 아이는 그 사이 아무 반응도 못 받는다 —
   *    「했어요」를 누른 그 순간이 부모가 알아야 할 시점이다.
   *
   * 🔴 알림 하나로 **승인 화면의 애니메이션**도 정해진다.
   *    안 읽은 알림이 있는 미션 카드가 움직이고, 부모가 화면을 열면 멈춘다.
   *    「새로 온 것」을 세는 자리를 두 곳에 두면 갈린다.
   */
  const m = await prisma.mission.findUnique({
    where: { id: missionId },
    select: { guardianId: true, title: true },
  });
  if (m) {
    await notifyOnce(m.guardianId, "MISSION_WAITING_NEW", missionId,
      "미션을 끝냈어요", `「${m.title}」 확인해 주세요.`);
  }
  return true;
}

/**
 * 잘못 눌렀을 때 되돌리기 — 아직 보호자가 안 봤을 때만.
 *
 * 🔴 **알림도 거둔다.** 안 거두면 부모가 알림을 눌러 가 보는데 그 미션이 없다.
 */
export async function undoDone(childId: string, missionId: string) {
  await prisma.notification.deleteMany({
    where: { missionId, kind: "MISSION_WAITING_NEW", readAt: null },
  });
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
      id: true, title: true, topic: true, reward: true, payoutWon: true,
      state: true, doneAt: true, decidedAt: true, rejectReason: true, sourceId: true,
    },
  });
  return rows.map((r) => toView(r));
}

/**
 * 아직 부모가 **못 본** 미션 id — 승인 화면이 그 카드만 움직인다 (어긋남 대장 D52).
 *
 * 🔴 **알림의 읽음 여부가 기준이다.** 「새로 온 것」을 세는 자리를 두 곳에 두면 갈린다 —
 *    잔액에서 세 번 겪은 그 모양이다.
 */
export async function unseenMissionIds(guardianId: string) {
  const rows = await prisma.notification.findMany({
    where: { guardianId, kind: "MISSION_WAITING_NEW", readAt: null, missionId: { not: null } },
    select: { missionId: true },
  });
  return new Set(rows.map((r) => r.missionId as string));
}

/**
 * 🔴 **봤다고 찍는다.** 승인 화면을 연 순간이 「확인」이다 —
 *    승인·거절까지 기다리면 화면을 여러 번 열어도 계속 움직인다.
 */
export async function markMissionsSeen(guardianId: string) {
  await prisma.notification.updateMany({
    where: { guardianId, kind: "MISSION_WAITING_NEW", readAt: null },
    data: { readAt: new Date() },
  });
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
    select: { id: true, childId: true, reward: true, payoutWon: true, doneAt: true,
              topic: true, cycleId: true, title: true },
  });
  if (!m) return false;

  // 승인이 하루보다 늦었으면 소급으로 표시한다 — 아이 화면이 「늦게 확인됐지만」이라고 말한다
  const late = Date.now() - m.doneAt!.getTime() > 864e5;

  /**
   * 🔴 **실천 기록을 함께 남긴다.** 별만 주면 나무가 자라지 않는다 —
   *    성장 나무의 실천 칸은 `practice_credits` 를 세기 때문이다.
   *    `PRC-001` 분해가 「승인 시 ⭐1 지급 **+ 실천 카운트 가산**」이라고 적었는데
   *    가산이 빠져 있었다. 별은 붙고 나무는 그대로인 상태가 됐다.
   *
   * 🔴 `earnedAt` 은 **아이가 한 시각**, `awardedAt` 은 확정 시각이다. 소급 승인이면 둘이 다르다.
   *    `cycleId` 는 완료 시점 주기에 귀속시킨다 — 지급 시각으로 계산하면
   *    늦게 본 승인이 **다음 달 나무를 부풀린다** (ACE-6.2).
   *
   * 재승인이 들어와도 별은 멱등키가 막고, 실천은 `practiceId` unique 가 막는다.
   */
  const credit = await prisma.practiceCredit.upsert({
    where: { id: m.id },
    create: {
      id: m.id,
      childId: m.childId,
      triggerCode: "MISSION_APPROVED",
      triggerPath: "PRACTICE",
      topic: m.topic,
      approvalMode: "parent",
      earnedAt: m.doneAt!,
      awardedAt: new Date(),
      cycleId: m.cycleId ?? cycleIdOf(m.doneAt!),
    },
    update: {},
    select: { id: true },
  });

  const granted = await grantStar({
    childId: m.childId,
    triggerCode: "MISSION_APPROVED",
    delta: m.reward,
    idempotencyKey: `mission:${m.id}`,
    practiceId: credit.id,
  });
  if (!granted.ok) return false;

  /**
   * 🔴 **금액이 걸려 있으면 용돈으로 들어간다** (`REQ-FUNC-002`).
   *    미션은 「벌기」의 실체다 — 심부름하고 용돈을 받는 것이 아이가 겪는 유일한
   *    **「버는」 경험**이다. 별만 주면 학습(`earn-3`)과 어긋난다.
   *
   * 🔴 별↔현금 전환이 아니다 (P-21). 보호자가 **일한 대가로 주는 것**이고
   *    실제 돈은 앱 밖에서 오간다. 원장은 그 사실을 적을 뿐이다 (D18).
   * 🔴 멱등키가 미션 id 라 두 번 승인해도 용돈은 한 번만 들어간다.
   */
  if (m.payoutWon > 0) {
    await recordAllowance(
      m.childId, m.payoutWon, "TOPUP", `${m.title} — 미션을 하고 받았어요`,
      `mission-payout:${m.id}`,
    );
  }

  await prisma.mission.update({
    where: { id: m.id },
    data: {
      state: late ? "BACKFILLED" : "APPROVED", decidedAt: new Date(),
    },
  });

  /**
   * 🔴 **판정 즉시 사진을 파기한다** (`AC-032-1` · `AC-032-2`).
   *    파기가 이 기능의 값이다 — 안 지우면 넣지 말았어야 할 기능이 된다.
   *    지운 시각은 따로 안 적는다. **`decidedAt` 이 곧 파기 시각**이다 —
   *    판정과 파기가 같은 순간이므로 컬럼을 하나 더 두면 두 값을 맞춰야 한다.
   */
  await destroyPhoto(m.id);
  return true;
}

/**
 * 거절 — 🔴 **사유 없이 거절하지 않는다.** 아이 화면에서 「미실천」과 구별되지 않으면
 *    아이는 「했는데 왜」만 남는다 (AC-6.2). 별은 붙지 않는다.
 */
export async function rejectMission(guardianId: string, missionId: string, reason: string) {
  const r = await prisma.mission.updateMany({
    where: { id: missionId, guardianId, state: "PENDING", doneAt: { not: null } },
    data: {
      state: "REJECTED", decidedAt: new Date(), rejectReason: reason.trim() || null,
    },
  });
  if (r.count !== 1) return false;
  // 🔴 **반려도 판정이다.** 승인만 지우면 반려된 미션에 사진이 남는다
  await destroyPhoto(missionId);
  return true;
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
  /**
   * 🔴 **미션은 「벌기」뿐이다** (사용자 결정 2026-09-01 · 어긋남 대장 D50).
   *
   *    미션은 **심부름하고 용돈을 받는 일**이다 — 아이가 겪는 유일한 「버는」 경험이다.
   *    나머지 영역은 실천 경로가 **이미 따로 있다** — 잘 쓰기는 계획 카드,
   *    모으기는 위시리스트 단계 보상, 불리기는 우리 집 적금.
   *    미션으로 겹쳐 열면 **같은 일을 두 곳에서 세고** 부모가 어느 쪽에 걸어야 할지 모른다.
   *
   * 🔴 **화면이 벌기만 보여도 여기서 다시 막는다.** 값을 `hidden` 으로 넘기므로
   *    폼을 우회하면 아무 영역이나 올 수 있다 (§6.6 규약 ②).
   */
  if (input.topic !== "EARN") return { ok: false, reason: "TOPIC_LOCKED" };

  if (!Number.isInteger(input.reward) || input.reward < REWARD_MIN || input.reward > REWARD_MAX) {
    return { ok: false, reason: "REWARD_OUT_OF_RANGE" };
  }
  // 🔴 금액은 0(별만) 부터 100,000원까지. 손이 미끄러진 0 하나를 막는다
  if (!Number.isInteger(input.payoutWon) || input.payoutWon < 0 || input.payoutWon > PAYOUT_MAX) {
    return { ok: false, reason: "PAYOUT_OUT_OF_RANGE" };
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
      payoutWon: input.payoutWon,
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
      id: true, title: true, topic: true, reward: true, payoutWon: true,
      state: true, doneAt: true, decidedAt: true, rejectReason: true,
    },
  });
  return rows.map((r) => toView(r));
}

/** 이 편의 실천을 지금 어디까지 왔나 — 학습 화면이 읽는다 */
export type PracticeState = "NONE" | "WAITING" | "DONE" | "REJECTED";

export async function getPracticeState(childId: string, lessonId: string): Promise<PracticeState> {
  const m = await prisma.mission.findFirst({
    where: { childId, sourceId: lessonId },
    select: { state: true, doneAt: true },
  });
  if (!m) return "NONE";
  /**
   * 🔴 **`AUTO_APPROVED` 가 빠져 있었다** (`D50` 이 상태를 더할 때 여기까지 안 왔다).
   *    72시간이 지나 자동 완료된 실천이 **영원히 「부모님 확인 중」**으로 굳었다 —
   *    별은 이미 받았는데 화면은 계속 기다린다고 말한다.
   */
  if (m.state === "APPROVED" || m.state === "BACKFILLED" || m.state === "AUTO_APPROVED") return "DONE";
  if (m.state === "REJECTED") return "REJECTED";
  return m.doneAt ? "WAITING" : "NONE";
}

/**
 * 「해봤어요」 — 배운 걸 실제로 한 것을 올린다. 어긋남 대장 D16.
 *
 * 🔴 **여기서 별을 주지 않는다.** 보호자가 승인해야 별이다. 아이가 자기 실천을
 *    스스로 인정하면 실천 인정이라는 개념 자체가 무의미해진다.
 * 🔴 **한 편당 한 장이다.** 두 번 눌러도 승인 대기가 두 줄로 늘지 않는다 (DB 유니크).
 * 🔴 거절된 것은 **되살려 다시 신청한다.** 한 번 거절로 그 편이 영영 막히면
 *    아이는 다시 해볼 이유가 없어진다.
 */
export async function claimPractice(childId: string, guardianId: string, lessonId: string) {
  const lesson = findLesson(lessonId);
  if (!lesson) return false;
  // 🔴 실천이 닫힌 영역은 서버에서 막는다. 화면만 감추면 요청은 그대로 통한다 (§6.6)
  if (!isPracticeOpen(lesson.topic)) return false;

  /**
   * 🔴 **영역마다 하루 하나다** (D47). 없으면 아이가 읽어 둔 편을 하루에 몰아
   *    올릴 수 있다 — 실제로 tester 의 「벌기」에 실천이 네 건 쌓여 있었다.
   *    「매일 조금씩」이 리듬인데 몰아 하면 그 리듬이 사라진다.
   *
   * 🔴 **다시 하기는 막지 않는다.** 오늘 올린 **그 편**을 다시 누르는 것은
   *    아래에서 「이미 했다」로 조용히 통과한다 — 오류가 아니다.
   */
  const claimedToday = await prisma.mission.findFirst({
    where: {
      childId, topic: lesson.topic, sourceId: { not: null },
      doneAt: { gte: kstDayStart() },
      NOT: { sourceId: lessonId },
    },
    select: { id: true },
  });
  if (claimedToday) return false;

  const exist = await prisma.mission.findFirst({
    where: { childId, sourceId: lessonId },
    select: { id: true, state: true, doneAt: true },
  });

  if (exist) {
    // 이미 승인됐거나 기다리는 중 — 아무것도 하지 않는다. 오류가 아니다
    if (exist.state !== "REJECTED" && exist.doneAt) return true;
    await prisma.mission.update({
      where: { id: exist.id },
      data: {
        state: "PENDING", doneAt: new Date(), cycleId: cycleIdOf(),
        decidedAt: null, rejectReason: null,
      },
    });
    return true;
  }

  await prisma.mission.create({
    data: {
      childId, guardianId, sourceId: lessonId,
      title: lesson.tryIt,
      topic: lesson.topic,
      reward: 1,
      // 🔴 학습에서 온 실천에는 금액이 없다. 아이가 스스로 금액을 정하면 그건 용돈이 아니다
      payoutWon: 0,
      state: "PENDING",
      doneAt: new Date(),
      cycleId: cycleIdOf(),
    },
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// 미션 사진 — FR-032 · 어긋남 대장 D32
//
// 🔴 **판정과 함께 사라진다.** 승인·반려 즉시, 그리고 72시간 만료에서 지운다.
//    `AC-032-2` 의 검증이 「스토리지 스캔 0건」이다.
//
// 🔴 이전 사양에서는 이 기능이 **제외**였다 — 아동 이미지 리스크 때문이다.
//    새 SRS 가 「판정 즉시 파기」를 조건으로 달아 다시 넣었고 사용자가 승인했다.
//    **파기가 이 기능의 값이다.** 파기를 빼면 넣지 말았어야 할 기능이 된다.
// ─────────────────────────────────────────────────────────────

/** 받아들이는 형식. 🔴 목록에 없는 것은 받지 않는다 — 임의 바이트가 들어오면 그것도 저장된다 */
const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
/** 🔴 5MB. 아이 폰 사진 한 장이고, 넘으면 브라우저가 아니라 서버가 거절한다 */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export type AttachPhotoResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "BAD_MIME" | "TOO_LARGE" | "EMPTY" };

/**
 * 미션에 사진을 붙인다 — **아이가 부른다.**
 *
 * 🔴 **내 아이의 미션이어야 한다.** `childId` 를 함께 건다 —
 *    미션 id 만 믿으면 남의 아이 미션에 사진을 붙일 수 있다.
 * 🔴 **「했어요」를 누른 미션에만** 붙는다. 판정을 기다리는 것이 아니면 볼 사람이 없다.
 * 🔴 **한 장이다.** 다시 올리면 덮어쓴다 — 여러 장을 허용하면 「보고 지운다」가 흐려진다.
 */
/**
 * 사진 규칙을 판단할 최소 정보 — 🔴 **`bytes` 를 안 읽는다.**
 *    올리기 전에 「이 미션이 사진을 요구하나」만 보면 되므로 두 필드면 족하다.
 */
export async function findForPhoto(childId: string, missionId: string) {
  const m = await prisma.mission.findFirst({
    where: { id: missionId, childId },
    select: { topic: true, sourceId: true },
  });
  return m ? { topic: m.topic as Topic, fromLesson: m.sourceId != null } : null;
}

export async function attachPhoto(
  childId: string, missionId: string, bytes: Uint8Array, mime: string,
): Promise<AttachPhotoResult> {
  if (!PHOTO_MIME.includes(mime as (typeof PHOTO_MIME)[number])) return { ok: false, reason: "BAD_MIME" };
  if (bytes.byteLength === 0) return { ok: false, reason: "EMPTY" };
  if (bytes.byteLength > PHOTO_MAX_BYTES) return { ok: false, reason: "TOO_LARGE" };

  const m = await prisma.mission.findFirst({
    where: { id: missionId, childId, state: "PENDING", doneAt: { not: null } },
    select: { id: true },
  });
  if (!m) return { ok: false, reason: "NOT_FOUND" };

  const buf = Buffer.from(bytes);
  await prisma.missionPhoto.upsert({
    where: { missionId },
    create: { missionId, bytes: buf, mime, byteSize: buf.byteLength },
    update: { bytes: buf, mime, byteSize: buf.byteLength, createdAt: new Date() },
  });
  return { ok: true };
}

/**
 * 보호자가 볼 사진 한 장. 🔴 **내 아이의 미션인지 먼저 확인한다.**
 *    조회 자체가 인가 지점이다 — 미션 id 는 화면에 노출되는 값이다.
 */
export async function readPhoto(guardianId: string, missionId: string) {
  const m = await prisma.mission.findFirst({
    where: { id: missionId, guardianId }, select: { id: true },
  });
  if (!m) return null;
  const p = await prisma.missionPhoto.findUnique({
    where: { missionId }, select: { bytes: true, mime: true },
  });
  return p ? { bytes: Buffer.from(p.bytes), mime: p.mime } : null;
}

/** 어느 미션에 사진이 붙어 있나 — 승인 화면이 자리를 만들지 정한다 */
export async function photoMissionIds(missionIds: readonly string[]) {
  if (missionIds.length === 0) return new Set<string>();
  const rows = await prisma.missionPhoto.findMany({
    where: { missionId: { in: [...missionIds] } }, select: { missionId: true },
  });
  return new Set(rows.map((r) => r.missionId));
}

/**
 * 🔴 **파기.** 판정한 순간 부른다. 없으면 아무 일도 하지 않는다 —
 *    사진이 없는 미션도 정상이므로 실패로 취급하지 않는다.
 */
export async function destroyPhoto(missionId: string) {
  await prisma.missionPhoto.deleteMany({ where: { missionId } });
}

// ─────────────────────────────────────────────────────────────
// 72시간 자동 만료 — FR-032 · AC-032-3 · 어긋남 대장 D37
// ─────────────────────────────────────────────────────────────

/** 🔴 「했어요」를 누른 뒤 이만큼 지나면 만료된다 */
export const EXPIRE_HOURS = 72;
/** 이만큼 지나면 승인 화면에서 눈에 띄게 한다 — 알림 인프라가 없어 화면 표시로 대신한다 */
export const REMIND_HOURS = 24;

/**
 * 판정되지 않은 채 72시간이 지난 미션을 만료시킨다.
 *
 * 🔴 **부모가 안 누르면 영원히 대기였다.** 아이 화면엔 「기다리는 중」이 계속 떠 있고,
 *    아이는 언제까지 기다려야 하는지 모른다. 기다림에 끝이 있어야 한다.
 *
 * 🔴 **⭐를 주지 않는다.** 부모가 확인하지 않은 것을 실천으로 인정하면
 *    승인이라는 절차 자체가 의미를 잃는다 (`PRC-001`).
 *
 * 🔴 **사진도 함께 파기한다.** 판정되지 않았다고 아동 이미지가 남으면 안 된다 (`D32`).
 *
 * 🔴 **`pg_cron` 이 붙으면 배치가 이 함수를 부르면 된다.** 지금은 화면을 열 때 부른다 —
 *    cron 이 없어서이고, 함수를 그대로 두면 옮길 때 화면은 안 바뀐다 (`ADR-T02`).
 *
 * @param scope 아이 하나(`childId`) 또는 보호자 하나(`guardianId`)로 좁힌다
 */
export async function autoCompleteStaleMissions(
  scope: { childId: string } | { guardianId: string },
): Promise<number> {
  const cutoff = new Date(Date.now() - EXPIRE_HOURS * 3600e3);
  const stale = await prisma.mission.findMany({
    where: { ...scope, state: "PENDING", doneAt: { not: null, lt: cutoff } },
    select: { id: true, childId: true, guardianId: true, reward: true, payoutWon: true,
              doneAt: true, topic: true, cycleId: true, title: true },
  });
  if (stale.length === 0) return 0;

  for (const m of stale) {
    /**
     * 🔴 **한 미션이 한 트랜잭션이다** (어긋남 대장 D54).
     *
     *    전에는 실천·별·용돈·상태를 **따로** 썼다. 중간에 죽으면
     *    **별과 돈은 나갔는데 상태는 `PENDING`** 으로 남는다 —
     *    다음에 화면을 열면 또 처리하려 하고, 멱등키가 별과 실천은 막지만
     *    **상태는 영영 안 바뀐다.** 아이는 완료된 미션을 「기다리는 중」으로 계속 본다.
     *
     * 🔴 **미션 단위로 묶는다.** 스무 건을 한 트랜잭션에 넣으면 하나가 실패할 때
     *    멀쩡한 열아홉이 함께 되돌아간다 — 그건 더 나쁘다.
     *
     * 🔴 사진 파기와 알림은 **밖에 둔다.** 실패해도 완료를 되돌릴 이유가 없고,
     *    사진은 다음 판정에서 다시 지워진다.
     */
    /**
     * 🔴 **승인과 같은 일을 한다** — 실천을 남기고 별을 준다.
     *    다른 것은 `approvalMode` 뿐이다: `"auto"`.
     *    「누가 인정했나」가 이 제품의 근거이므로 그 한 글자가 남아야
     *    나중에 지표에서 가려낼 수 있다.
     *
     * 🔴 **귀속 주기는 완료 시점이다.** 지금 시각으로 계산하면
     *    사흘 지나 자동 완료된 것이 **다음 달 나무를 부풀린다** (ACE-6.2).
     */
    await prisma.$transaction(async (tx) => {
      const credit = await tx.practiceCredit.upsert({
        where: { id: m.id },
        create: {
          id: m.id, childId: m.childId,
          triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", topic: m.topic,
          approvalMode: "auto",
          earnedAt: m.doneAt!, awardedAt: new Date(),
          cycleId: m.cycleId ?? cycleIdOf(m.doneAt!),
        },
        update: {}, select: { id: true },
      });

      // 🔴 별 원장은 「합이 잔액」이다. 같은 트랜잭션 안에서 마지막 잔액을 읽어야 어긋나지 않는다
      const agg = await tx.starLedgerEntry.aggregate({
        where: { childId: m.childId }, _sum: { delta: true },
      });
      const balanceAfter = (agg._sum.delta ?? 0) + m.reward;
      try {
        await tx.starLedgerEntry.create({
          data: {
            childId: m.childId, delta: m.reward, triggerCode: "MISSION_APPROVED",
            balanceAfter, idempotencyKey: `mission:${m.id}`, practiceId: credit.id,
          },
        });
      } catch (e) {
        // 이미 지급된 것 — 오류가 아니다 (재처리)
        if ((e as { code?: string }).code !== "P2002") throw e;
      }

      // 🔴 금액이 걸려 있으면 용돈으로 들어간다 — 승인과 같다 (REQ-FUNC-002)
      if (m.payoutWon > 0) {
        const bal = await tx.allowanceEntry.aggregate({
          where: { childId: m.childId }, _sum: { delta: true },
        });
        try {
          await tx.allowanceEntry.create({
            data: {
              childId: m.childId, delta: m.payoutWon, code: "TOPUP",
              memo: `${m.title} — 미션을 하고 받았어요`,
              idempotencyKey: `mission-payout:${m.id}`,
              balanceAfter: (bal._sum.delta ?? 0) + m.payoutWon,
            },
          });
        } catch (e) {
          if ((e as { code?: string }).code !== "P2002") throw e;
        }
      }

      await tx.mission.update({
        where: { id: m.id },
        data: { state: "AUTO_APPROVED", decidedAt: new Date() },
      });
    });

    // 🔴 사진은 파기한다. 판정이 자동이어도 아동 이미지가 남으면 안 된다 (D32)
    await destroyPhoto(m.id);

    // 🔴 부모에게 무슨 일이 있었는지 남긴다. 모르는 채로 두면 별이 왜 나갔는지 알 수 없다
    await notifyOnce(m.guardianId, "MISSION_AUTO_DONE", m.id,
      "기간이 지나서 완료되었습니다", `「${m.title}」`);
  }
  return stale.length;
}

/**
 * 🔴 **같은 일로 두 번 알리지 않는다.** 화면을 열 때마다 판정하므로
 *    막지 않으면 알림이 쌓인다. `(guardianId, kind, missionId)` unique 가 막는다.
 */
/**
 * 알림 한 줄 + 폰으로 밀어 보내기 — 어긋남 대장 D51 · D56.
 *
 * 🔴 **여기가 유일한 알림 생성 지점이다.** 세 종류(`MISSION_WAITING_NEW` ·
 *    `MISSION_WAITING` · `MISSION_AUTO_DONE`)가 모두 이 함수를 거치므로
 *    푸시도 여기 한 곳에만 붙인다. 각 호출부에 흩으면 새 알림을 추가할 때 빠뜨린다.
 *
 * 🔴 **표에 줄이 남는 것이 「알렸다」의 정의다.** 푸시는 그것을 폰에 띄우는 수단이다 —
 *    실패해도 던지지 않는다. 반대로 하면 푸시 서버가 잠깐 죽었을 때
 *    미션 승인 흐름 전체가 멈춘다.
 *
 * 🔴 **중복 알림에는 푸시도 안 보낸다.** `P2002` 로 잡히는 경우는 이미 알린 것이다.
 *    그때 푸시를 보내면 부모 폰에 같은 알림이 두 번 뜬다.
 */
async function notifyOnce(
  guardianId: string, kind: string, missionId: string | null, title: string, body: string,
) {
  try {
    await prisma.notification.create({ data: { guardianId, kind, missionId, title, body } });
  } catch (e) {
    // 이미 알린 것 — 오류가 아니다
    if ((e as { code?: string }).code !== "P2002") throw e;
    return;
  }

  /**
   * 🔴 **본문에 아이 이름·금액을 넣지 않는다.** 푸시는 잠금화면에 뜬다 —
   *    폰을 든 사람은 누구나 읽는다. 미션 제목까지가 한계다.
   *
   * 🔴 tag 를 미션 단위로 묶는다. 한 미션에 리마인드가 여러 번 가도
   *    잠금화면에 한 줄만 남는다 — 쌓이면 부모가 알림을 아예 끈다.
   */
  try {
    await sendToGuardian(guardianId, {
      title,
      body,
      url: "/parent/alerts",
      tag: missionId ? `mission:${missionId}` : `kind:${kind}`,
    });
  } catch {
    // 알림함에는 이미 남았다. 푸시 실패가 흐름을 멈추게 하지 않는다
  }
}

/**
 * 24시간 넘게 기다리는 미션을 **한 번씩** 알린다 — `FR-032` 「24h 미승인 → 리마인드 1회」.
 *
 * 🔴 **인앱 알림함이다.** 웹푸시·메일·알림톡이 없어 앱 밖으로 내보낼 방법이 없다 —
 *    부모가 앱을 열어야 본다. 발송 채널이 붙으면 보낼 대상이 그대로 이 표가 된다.
 */
export async function remindStaleMissions(
  scope: { childId: string } | { guardianId: string },
): Promise<number> {
  const cutoff = new Date(Date.now() - REMIND_HOURS * 3600e3);
  const late = await prisma.mission.findMany({
    where: { ...scope, state: "PENDING", doneAt: { not: null, lt: cutoff } },
    select: { id: true, guardianId: true, title: true },
  });
  for (const m of late) {
    await notifyOnce(m.guardianId, "MISSION_WAITING", m.id,
      "미션을 확인해 주세요", `「${m.title}」 아이가 기다리고 있어요.`);
  }
  return late.length;
}

/** 24시간 넘게 기다리는 미션 수 — 승인 화면이 눈에 띄게 한다 */
export async function countOverdue(guardianId: string) {
  return prisma.mission.count({
    where: {
      guardianId, state: "PENDING",
      doneAt: { not: null, lt: new Date(Date.now() - REMIND_HOURS * 3600e3) },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 보호자 알림함 — 어긋남 대장 D51
// ─────────────────────────────────────────────────────────────

export type NotificationView = {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly whenLabel: string;
  readonly unread: boolean;
};

/** 안 읽은 알림 수 — 나무 화면이 배지로 보여준다 */
export async function countUnread(guardianId: string) {
  return prisma.notification.count({ where: { guardianId, readAt: null } });
}

export async function listNotifications(guardianId: string, take = 30): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { guardianId }, orderBy: { createdAt: "desc" }, take,
    select: { id: true, kind: true, title: true, body: true, readAt: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id, kind: r.kind, title: r.title, body: r.body,
    whenLabel: whenLabel(r.createdAt) ?? "",
    unread: r.readAt === null,
  }));
}

/**
 * 🔴 **읽음은 화면을 열 때 찍는다.** 각 줄에 「읽음」 버튼을 두면 아무도 안 누르고
 *    배지가 영영 안 사라진다. 목록을 봤다는 것이 읽었다는 뜻이다.
 */
export async function markAllRead(guardianId: string) {
  await prisma.notification.updateMany({
    where: { guardianId, readAt: null },
    data: { readAt: new Date() },
  });
}
