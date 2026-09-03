import "server-only";
import { prisma } from "@/db";
import { notifyOnce } from "@/modules/notification";
import { relativeWhen } from "@/lib/when";
import {
  CATEGORIES, categoryOf,
  type NewPlanCard, type PlanCardView, type RetroView,
  type SpendLineView, type SpendSummaryView,
} from "@/contracts/plan";
import { kstDay } from "@/modules/attendance";
import { grantStar } from "@/modules/star-ledger";
import { record as recordAllowance } from "@/modules/allowance";
import { attach as attachTxn, findByRecord } from "@/modules/card";

/**
 * 계획 카드 · 계획↔실제 대조 — PLN-001 · PLN-002 · PLN-003 슬라이스.
 *
 * 🔴 **⭐ 판정은 금액 단독이다** (ADR-008).
 *    업종 일치는 회고 **문장을 분기**할 뿐, 별을 차단하지 않는다.
 *    둘을 섞으면 「업종이 달라서 별을 못 받았다」가 되어 아이가 규칙을 오해한다.
 *
 * 🔴 **넘긴 날에도 회고 문장은 똑같이 나온다.**
 *    생략하면 넘긴 날 화면이 비고, 아이는 회고 자체를 피하게 된다.
 */

/**
 * 회고 문장 — 🔴 `DAT-003` 이 문장 풀을 채울 때까지 상수다.
 *    풀에서 **비복원 추출**하는 규칙(재노출률 ≤ 2/8)은 그때 붙는다.
 */
const RETRO_MET = ["적은 대로 잘 썼어요.", "계획한 만큼만 샀네요."];
const RETRO_MET_MISMATCH = ["적은 만큼만 썼어요.", "적어둔 것과 다른 걸 샀네요."];
const RETRO_EXCEEDED = (over: number) => [
  `계획보다 ${over.toLocaleString("ko-KR")}원 더 썼어요.`,
  "적어두지 않았던 게 있었네요.",
];

/** 🔴 장소를 덧붙인 변형. 「어제 · 문구점」처럼 읽힌다 */
function whenLabel(at: Date, where: string | null, now = new Date()) {
  const when = relativeWhen(at, now);
  return where ? `${when} · ${where}` : when;
}

export async function getRetro(childId: string, recordId: string): Promise<RetroView | null> {
  const rec = await prisma.spendingRecord.findFirst({
    where: { id: recordId, childId },
    select: {
      id: true, actualAmount: true, merchantCategory: true, matchResult: true,
      categoryMatch: true, occurredAt: true,
      planCard: { select: { id: true, whereText: true, category: true, limitAmount: true } },
    },
  });
  if (!rec) return null;

  const plan = rec.planCard;
  const planCat = plan ? categoryOf(plan.category) : null;
  const actCat = categoryOf(rec.merchantCategory);

  const planned: SpendLineView[] = plan
    ? [{ icon: planCat!.icon, label: planCat!.label, amount: plan.limitAmount, unplanned: false }]
    : [];

  const actual: SpendLineView[] = [{
    icon: actCat.icon, label: actCat.label, amount: rec.actualAmount,
    unplanned: rec.categoryMatch === "MISMATCHED",
  }];

  const over = plan ? rec.actualAmount - plan.limitAmount : 0;
  const met = rec.matchResult === "MET";

  const retroLines = !plan ? ["아직 적어둔 계획이 없어요.", "다음엔 가기 전에 적어볼까요?"]
    : met ? (rec.categoryMatch === "MISMATCHED" ? RETRO_MET_MISMATCH : RETRO_MET)
    : RETRO_EXCEEDED(over);

  const starLabel = !plan ? "⭐ 없음"
    : met ? "⭐ 1개를 받았어요"
    // 🔴 「차감」이 아니라 「그대로」다. 별을 빼앗지 않는다 (P-03)
    : "⭐ 없음 · 가진 별은 그대로예요";

  // 같은 아이의 다른 갈래 하나 — 인터뷰에서 지킴↔넘김을 바로 비교하려고
  const other = await prisma.spendingRecord.findFirst({
    where: { childId, id: { not: recordId }, matchResult: met ? "EXCEEDED" : "MET" },
    select: { id: true },
    orderBy: { occurredAt: "desc" },
  });

  /**
   * 🔴 **카드 내역과 대조한다.** 아이가 적은 금액과 실제가 다르면 그 차이를 보여준다 —
   *    이게 카드 연동의 목적이다. 자동으로 고쳐 주지 않는다. 아이가 마주해야 한다.
   */
  const txn = await findByRecord(childId, rec.id);
  const gap = txn ? txn.amount - rec.actualAmount : 0;

  return {
    id: rec.id,
    whenLabel: whenLabel(rec.occurredAt, plan?.whereText ?? null),
    planned, actual,
    match: rec.matchResult,
    retroLines, starLabel,
    otherBranchId: other?.id ?? null,
    card: txn ? { merchant: txn.merchant, amount: txn.amount, gap, isMock: txn.isMock } : null,
  };
}

/** 가장 최근 회고 — 목록 없이 바로 들어갈 때 */
export async function getLatestRetroId(childId: string) {
  const r = await prisma.spendingRecord.findFirst({
    where: { childId }, orderBy: { occurredAt: "desc" }, select: { id: true },
  });
  return r?.id ?? null;
}

/**
 * 계획 카드 저장 — PLN-001.
 * 🔴 「예산」·「한도」가 아니라 **계획 카드**다. 적는 주체를 기록한다 — 보호자가 대신 적어도 남는다.
 */
export async function createPlanCard(childId: string, input: NewPlanCard) {
  const known = CATEGORIES.some((c) => c.code === input.category);
  if (!known) throw new Error("모르는 업종이다");
  if (input.limitAmount <= 0) throw new Error("금액은 0보다 커야 한다");

  const card = await prisma.planCard.create({
    data: {
      childId,
      whereText: input.where.trim(),
      category: input.category,
      limitAmount: input.limitAmount,
      items: input.items?.trim() || null,
      author: input.author === "보호자" ? "GUARDIAN" : "CHILD",
    },
    select: { id: true },
  });

  /**
   * 🔴 **첫 장만 알린다** (어긋남 대장 D75 · 사용자 결정).
   *
   *    「우리 아이가 계획을 세우기 시작했다」는 부모가 알 값어치가 있다.
   *    그런데 **매번 알리면 부모가 알림을 아예 끈다** — 그러면 정작 승인이
   *    필요한 미션·적금 알림도 같이 죽는다. 여기서 아끼는 것이 저기를 살린다.
   *
   * 🔴 **아이 id 로 묶는다.** 「이 아이의 첫 계획」이므로 아이당 한 번이다.
   *    보호자 id 로 묶으면 둘째 아이의 첫 장이 안 간다.
   *
   * 🔴 **보호자가 대신 적은 것은 안 알린다.** 자기가 한 일을 자기에게 알리는 셈이다.
   */
  if (input.author !== "보호자") await notifyFirstPlan(childId);
  return card;
}

/**
 * 🔴 **「처음인가」를 세는 자리는 여기 하나다.** 호출부에서 세면, 새로 부르는 곳이
 *    생길 때 그 규칙을 빠뜨린다.
 *    알림 표의 「한 번만」 장치가 마지막 그물이라, 여기서 새는 것도 결국 한 번만 간다.
 */
async function notifyFirstPlan(childId: string) {
  const count = await prisma.planCard.count({ where: { childId, author: "CHILD" } });
  if (count !== 1) return;

  const child = await prisma.childAccount.findUnique({
    where: { id: childId }, select: { guardianId: true },
  });
  if (!child) return;

  await notifyOnce(
    child.guardianId, "FIRST_PLAN", childId,
    "첫 계획 카드를 적었어요",
    "아이가 쓰기 전에 계획을 세웠어요. 쓴 뒤에 같이 맞춰 보세요.",
  );
}

// ─────────────────────────────────────────────────────────────
// 소비 내역 — PLN-005 · §6.1 진입점 11번 (RSC 읽기)
// ─────────────────────────────────────────────────────────────

/**
 * 🔴 **결제 웹훅(PTN-002)이 아직 없다.** `spending_records` 는 시드로만 들어온다.
 *    그래도 집계 자체는 실제 표에서 센다 — 웹훅이 붙으면 이 함수는 바뀌지 않는다.
 *
 * 🔴 「계획에 없던 업종」은 **강조 표시일 뿐 잘못이 아니다.** ⭐ 판정은 금액 단독이다
 *    (ADR-008). 화면 문구도 그렇게 적는다.
 */
/** 소비 한 건 → 화면 줄. 🔴 이번 달과 지난달을 **같은 방법으로** 만든다 */
function toRecord(r: {
  id: string; actualAmount: number; merchantCategory: string;
  planCardId: string | null; categoryMatch: string | null; occurredAt: Date;
}) {
  const c = categoryOf(r.merchantCategory);
  return {
    id: r.id,
    dayLabel: `${r.occurredAt.getMonth() + 1}월 ${r.occurredAt.getDate()}일`,
    icon: c.icon,
    categoryLabel: c.label,
    amount: r.actualAmount,
    // 🔴 셋 다 사실 진술이다. 어느 것도 잘못을 뜻하지 않는다 (ADR-008)
    planNote: r.planCardId === null
      ? ("계획 없이" as const)
      : r.categoryMatch === "MISMATCHED"
        ? ("계획에 없던 업종" as const)
        : ("계획에 있었어요" as const),
  };
}

export async function getSpendSummary(childId: string): Promise<SpendSummaryView> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, prevMonth] = await Promise.all([
    prisma.spendingRecord.findMany({
      where: { childId, occurredAt: { gte: monthStart } },
      select: { id: true, actualAmount: true, merchantCategory: true, planCardId: true, categoryMatch: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.spendingRecord.findMany({
      where: { childId, occurredAt: { gte: prevStart, lt: monthStart } },
      // 🔴 합계만 세면 달이 바뀐 날 화면이 「기록 없음」이 된다. 목록도 같이 만든다
      select: { id: true, actualAmount: true, merchantCategory: true, planCardId: true, categoryMatch: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const total = thisMonth.reduce((s, r) => s + r.actualAmount, 0);
  const prevTotal = prevMonth.reduce((s, r) => s + r.actualAmount, 0);

  // 업종별 집계. 계획에 없던 업종은 강조 대상으로 표시한다
  const bucket = new Map<string, { amount: number; unplanned: boolean }>();
  for (const r of thisMonth) {
    const cur = bucket.get(r.merchantCategory) ?? { amount: 0, unplanned: false };
    cur.amount += r.actualAmount;
    // 계획이 없었거나 업종이 어긋났으면 강조한다
    if (r.planCardId === null || r.categoryMatch === "MISMATCHED") cur.unplanned = true;
    bucket.set(r.merchantCategory, cur);
  }

  const byCategory = [...bucket.entries()]
    .map(([code, v]) => {
      const c = categoryOf(code);
      return { icon: c.icon, label: c.label, amount: v.amount, unplanned: v.unplanned };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    monthLabel: `${now.getMonth() + 1}월`,
    total,
    prevTotal,
    delta: total - prevTotal,
    hasPrevMonth: prevMonth.length > 0,
    byCategory,
    noPlanCount: thisMonth.filter((r) => r.planCardId === null).length,
    recordCount: thisMonth.length,
    /**
     * 🔴 **집계와 같은 배열에서 만든다.** 따로 조회하면 합계와 목록이 어긋난다 —
     *    통장에서 이미 그 실수를 했다 (어긋남 대장 D22).
     */
    records: thisMonth.map(toRecord),
    // 🔴 달이 바뀐 날 「기록이 없다」로 보이지 않게 한다
    prevRecords: prevMonth.map(toRecord),
  };
}

/**
 * ── 적어둔 계획 목록 · 실제로 쓴 돈 적기 ────────────────
 *
 * 🔴 **여기까지가 없어서 고리가 끊겨 있었다.** 계획은 저장되는데 아이가 다시 볼 수 없었고,
 *    실제 지출을 적을 길이 없어 회고가 열리지 않았다 — 시드가 넣은 기록으로만 볼 수 있었다.
 *
 * 원래 설계는 실제 지출이 **카드 연동**(`DAT-004`)에서 온다. 그게 붙기 전까지 손으로 적는다.
 */

/**
 * 오늘 만든 계획 카드가 있나 — 🔴 **판단을 한 곳에 둔다.**
 *
 * 하교 모달(`D41` 조건 ③)과 실천 화면의 「쓰기」 칸이 같은 것을 묻는다.
 * 각자 세면 **한쪽은 「계획 없음」이라 흔들고 다른 쪽은 안 묻는** 상태가 생긴다.
 *
 * 🔴 KST 하루의 경계를 UTC 로 돌려서 센다. 서버가 어디서 돌든 아이가 사는 날짜다.
 */
export async function hasPlanToday(childId: string, now = new Date()) {
  const today = kstDay(now);
  const dayStart = new Date(Date.parse(`${today}T00:00:00.000Z`) - 9 * 60 * 60 * 1000);
  const n = await prisma.planCard.count({ where: { childId, createdAt: { gte: dayStart } } });
  return n > 0;
}

export async function getPlanCards(childId: string): Promise<PlanCardView[]> {
  const rows = await prisma.planCard.findMany({
    where: { childId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, whereText: true, category: true, limitAmount: true,
      items: true, author: true, createdAt: true,
      spendings: { select: { id: true, matchResult: true }, take: 1 },
    },
  });

  return rows.map((r) => {
    const cat = categoryOf(r.category);
    const rec = r.spendings[0] ?? null;
    return {
      id: r.id, where: r.whereText, icon: cat.icon, categoryLabel: cat.label,
      limitAmount: r.limitAmount, items: r.items,
      whenLabel: whenLabel(r.createdAt, null),
      byGuardian: r.author === "GUARDIAN",
      recordId: rec?.id ?? null,
      match: rec ? (rec.matchResult === "NO_PLAN" ? null : rec.matchResult) : null,
    };
  });
}

export type RecordResult =
  | { ok: true; recordId: string; met: boolean; starred: boolean }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY" | "BAD_AMOUNT" | "NOT_ENOUGH" };

/** 한 번에 적을 수 있는 금액 — 손이 미끄러진 0 하나를 막는다 */
export const MAX_ACTUAL = 1_000_000;

/**
 * 「얼마 썼는지 적기」 → 회고 — PLN-002 · PLN-003.
 *
 * 🔴 **⭐ 판정은 금액 단독이다** (ADR-008). 업종이 달라도 금액을 지켰으면 별을 준다.
 *    섞으면 「업종이 달라서 별을 못 받았다」가 되어 아이가 규칙을 오해한다.
 * 🔴 **넘겨도 차감하지 않는다** (P-03). 미지급일 뿐이다.
 * 🔴 **계획 하나에 실제 하나다.** 다시 적어 별을 또 받을 수 없다 — 멱등키도 계획 id 다.
 * 🔴 지킨 경우는 **실천**이다(성장 나무 「계획 지키기」). `PracticeCredit` 을 남긴다.
 */
export async function recordActual(
  childId: string, planCardId: string, actualAmount: number, actualCategory: string,
  /** 카드 내역에서 골랐다면 그 거래 id — 🔴 **금액은 여전히 아이가 적은 값이다.** 대조용이다 */
  cardTxnId?: string,
): Promise<RecordResult> {
  if (!Number.isFinite(actualAmount) || actualAmount < 0 || actualAmount > MAX_ACTUAL) {
    return { ok: false, reason: "BAD_AMOUNT" };
  }
  const plan = await prisma.planCard.findFirst({
    where: { id: planCardId, childId },
    select: {
      id: true, whereText: true, category: true, limitAmount: true,
      spendings: { select: { id: true }, take: 1 },
    },
  });
  if (!plan) return { ok: false, reason: "NOT_FOUND" };
  if (plan.spendings.length > 0) return { ok: false, reason: "ALREADY" };

  const amount = Math.floor(actualAmount);
  const met = amount <= plan.limitAmount;
  const known = CATEGORIES.some((c) => c.code === actualCategory);
  const category = known ? actualCategory : plan.category;
  const now = new Date();

  // 🔴 **쓴 돈은 용돈에서 빠진다** (D18). 0원은 「안 썼다」이므로 장부를 건드리지 않는다
  if (amount > 0) {
    const paid = await recordAllowance(
      childId, -amount, "PLAN_SPEND", `${plan.whereText}에서 썼어요`, `plan-spend:${plan.id}`,
    );
    if (!paid.ok) return { ok: false, reason: "NOT_ENOUGH" };
  }

  const rec = await prisma.spendingRecord.create({
    data: {
      planCardId: plan.id, childId, actualAmount: amount,
      merchantCategory: category,
      matchResult: met ? "MET" : "EXCEEDED",
      categoryMatch: category === plan.category ? "MATCHED" : "MISMATCHED",
      occurredAt: now,
    },
    select: { id: true },
  });

  // 🔴 거래를 붙여 둔다. 한 거래는 한 번만 쓰인다 — 같은 거래로 별을 두 번 받을 수 없다
  if (cardTxnId) await attachTxn(childId, cardTxnId, rec.id);

  if (!met) return { ok: true, recordId: rec.id, met: false, starred: false };

  const credit = await prisma.practiceCredit.create({
    data: {
      childId, triggerCode: "SPENDING_RETRO", triggerPath: "PRACTICE",
      topic: "SPEND", approvalMode: "auto",
      earnedAt: now, awardedAt: now,
      cycleId: now.getFullYear() * 100 + (now.getMonth() + 1),
    },
  });
  const res = await grantStar({
    childId, triggerCode: "SPENDING_RETRO", delta: 1,
    idempotencyKey: `retro:${plan.id}`, practiceId: credit.id,
  });

  return { ok: true, recordId: rec.id, met: true, starred: res.ok && !res.duplicated };
}
