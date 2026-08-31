import "server-only";
import { prisma } from "@/db";
import { CATEGORIES, categoryOf, type NewPlanCard, type RetroView, type SpendLineView, type SpendSummaryView } from "@/contracts/plan";

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

function whenLabel(at: Date, where: string | null, now = new Date()) {
  const days = Math.floor((now.getTime() - at.getTime()) / 864e5);
  const when = days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
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

  return {
    id: rec.id,
    whenLabel: whenLabel(rec.occurredAt, plan?.whereText ?? null),
    planned, actual,
    match: rec.matchResult,
    retroLines, starLabel,
    otherBranchId: other?.id ?? null,
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

  return prisma.planCard.create({
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
export async function getSpendSummary(childId: string): Promise<SpendSummaryView> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, prevMonth] = await Promise.all([
    prisma.spendingRecord.findMany({
      where: { childId, occurredAt: { gte: monthStart } },
      select: { actualAmount: true, merchantCategory: true, planCardId: true, categoryMatch: true },
    }),
    prisma.spendingRecord.findMany({
      where: { childId, occurredAt: { gte: prevStart, lt: monthStart } },
      select: { actualAmount: true },
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
  };
}
