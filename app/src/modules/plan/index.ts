import "server-only";
import { prisma } from "@/db";
import { recentSpends } from "@/modules/envelope";
import {
  categoryOf,
  type PlanCardView, type RetroView,
  type SpendLineView, type SpendSummaryView,
} from "@/contracts/plan";
import { findByRecord } from "@/modules/card";

/**
 * 계획 카드 — 🔴 **읽기 전용이다.**
 *
 * **봉투(`FR-020`·`FR-021`)가 이 자리를 가져갔다.** 두 경로가 함께 살아 있으면
 * 아이가 두 군데서 소비를 적고 **⭐ 판정 기준이 둘**이 된다(계획 한도 vs 봉투 잔액).
 * 그래서 **쓰기를 멈췄다.** 표와 옛 기록은 남는다 — 지우면 지난 데이터가 사라지고
 * 부모 소비 내역이 깨진다.
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
    // 🔴 봉투 이전 기록이다. 문구도 그때 말이어야 한다 (어긋남 대장 D35)
    planNote: r.planCardId === null
      ? "계획 없이"
      : r.categoryMatch === "MISMATCHED"
        ? "계획에 없던 업종"
        : "계획에 있었어요",
    overBy: 0,
    legacy: true,
  };
}

/**
 * 봉투로 쓴 한 건 → 화면 줄.
 *
 * 🔴 **넘겨도 음수로 쓰지 않는다** — 「700원 넘었어요」다. 「−700원」은 빚으로 읽힌다.
 * 🔴 **초과는 잘못이 아니다.** 결제는 통과했고(`AC-021-2`) ⭐만 안 나갔다.
 */
function envelopeToRecord(r: {
  id: string; merchant: string | null; category: string; amount: number;
  within: boolean; overBy: number; unclassified: boolean; occurredAt: Date;
  envelopeName: string; envelopeEmoji: string; icon: string;
}) {
  return {
    id: r.id,
    dayLabel: `${r.occurredAt.getMonth() + 1}월 ${r.occurredAt.getDate()}일`,
    icon: r.icon,
    categoryLabel: r.merchant?.trim() || categoryOf(r.category).label,
    amount: r.amount,
    planNote: r.unclassified
      ? "어느 봉투인지 몰라요"
      : r.within
        ? `${r.envelopeEmoji} ${r.envelopeName} 봉투에서 썼어요`
        : `${r.envelopeEmoji} ${r.envelopeName} 봉투를 ${r.overBy.toLocaleString("ko-KR")}원 넘었어요`,
    overBy: r.within ? 0 : r.overBy,
    legacy: false,
  };
}

export async function getSpendSummary(childId: string): Promise<SpendSummaryView> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  /**
   * 🔴 **소비가 두 표에 있다.** 봉투(`envelope_spends`)가 지금 경로이고,
   *    계획 카드(`spending_records`)는 봉투 이전 기록이다.
   *    한쪽만 읽으면 **봉투로 쓴 돈이 부모 화면에 아예 안 나온다** —
   *    잔액에서 세 번 겪은 것과 같은 모양이다 (어긋남 대장 D35).
   */
  const [thisMonth, prevMonth, envelopeRows] = await Promise.all([
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
    recentSpends(childId, 50),
  ]);

  /**
   * 🔴 **합계도 두 표를 함께 센다.** 목록만 합치고 합계를 한쪽만 세면
   *    「4,500원인데 줄을 더하면 5,700원」이 된다 — 통장에서 이미 겪은 실수다 (`D22-b`).
   *
   * 🔴 **환불된 건은 빼지 않는다.** 실제로 쓴 적이 있는 기록이고,
   *    빼면 이번 달 합계가 과거로 바뀐다. 화면이 환불을 따로 말한다.
   */
  const envThis = envelopeRows.filter((e) => e.occurredAt >= monthStart);
  const envPrev = envelopeRows.filter((e) => e.occurredAt >= prevStart && e.occurredAt < monthStart);

  const total = thisMonth.reduce((s, r) => s + r.actualAmount, 0)
    + envThis.reduce((s, r) => s + r.amount, 0);
  const prevTotal = prevMonth.reduce((s, r) => s + r.actualAmount, 0)
    + envPrev.reduce((s, r) => s + r.amount, 0);

  // 업종별 집계 — 두 경로의 업종 코드가 같아서 그대로 합쳐진다
  const bucket = new Map<string, { amount: number; unplanned: boolean }>();
  const bump = (code: string, amount: number, unplanned: boolean) => {
    const cur = bucket.get(code) ?? { amount: 0, unplanned: false };
    cur.amount += amount;
    if (unplanned) cur.unplanned = true;
    bucket.set(code, cur);
  };
  // 봉투 이전 기록 — 계획이 없었거나 업종이 어긋났으면 강조한다
  for (const r of thisMonth) {
    bump(r.merchantCategory, r.actualAmount, r.planCardId === null || r.categoryMatch === "MISMATCHED");
  }
  // 🔴 봉투 기록 — 강조는 **봉투를 넘겼거나 분류가 안 된 것**이다.
  //    넘긴 것은 잘못이 아니라 「부모가 알아야 할 것」이다 (AC-021-2 · 결제는 통과했다)
  for (const r of envThis) bump(r.category, r.amount, !r.within || r.unclassified);

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
    // 계획 없이 나간 소비 + 어느 봉투인지 모르는 소비 — 둘 다 「대조할 것이 없는」 건이다
    noPlanCount: thisMonth.filter((r) => r.planCardId === null).length
      + envThis.filter((r) => r.unclassified).length,
    recordCount: thisMonth.length + envThis.length,
    /**
     * 🔴 **집계와 같은 배열에서 만든다.** 따로 조회하면 합계와 목록이 어긋난다 —
     *    통장에서 이미 그 실수를 했다 (어긋남 대장 D22).
     */
    records: [...envelopeRows.filter((e) => e.occurredAt >= monthStart).map(envelopeToRecord),
              ...thisMonth.map(toRecord)],
    // 🔴 달이 바뀐 날 「기록이 없다」로 보이지 않게 한다
    prevRecords: [...envelopeRows.filter((e) => e.occurredAt >= prevStart && e.occurredAt < monthStart).map(envelopeToRecord),
                  ...prevMonth.map(toRecord)],
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
