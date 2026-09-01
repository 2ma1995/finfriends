import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import { getBalance, record as recordAllowance } from "@/modules/allowance";

/**
 * 우리 집 적금 — 어긋남 대장 D25.
 *
 * 🔴 **외부 금융기관 가입을 중개하지 않는다** (P-20 · REQ-NF-012).
 *    이 파일에 외부 링크도, 외부 API 호출도 없다. **부모와 아이의 약속**이고
 *    이자는 **부모가 자기 돈으로** 준다. 금융상품이 아니다.
 *
 * 🔴 **이게 「불리기」 실천을 여는 유일한 길이다.** SRS 가 `SAVINGS_JOINED`(⭐1)와
 *    `SAVINGS_DONE`(⭐10)을 정의해 뒀는데 쓰는 곳이 없어서, 불리기 나무가 자랄
 *    방법이 아예 없었다 (GRW-001: 불리기 주기 = 적금 시작~만기).
 *
 * 🔴 **아이가 신청하고 보호자가 받아들인다.** 아이가 스스로 시작하면 부모 돈으로 주는
 *    이자를 아이가 정하는 셈이 된다.
 */

export const MIN_AMOUNT = 1_000;
export const MAX_MONTHS = 12;
/** 적금 — 한 회 최소 금액과 회차 범위 (주 단위) */
export const MIN_PER_PERIOD = 500;
export const MIN_PERIODS = 2;
export const MAX_PERIODS = 52;
export type SavingsKind = "DEPOSIT" | "INSTALLMENT";
/** 아이가 골라 볼 수 있는 이자율 — 🔴 **바라는 값**이지 정해지는 값이 아니다 */
export const WANTED_CHOICES = [3, 5, 10, 15] as const;
export const MAX_PCT = 20;

export type SavingsView = {
  readonly id: string;
  readonly goal: string;
  readonly kind: SavingsKind;
  /** 적금 — 한 회 금액 · 총 회차 · 넣은 회차 */
  readonly perPeriod: number | null;
  readonly periods: number | null;
  readonly paidCount: number;
  /** 지금까지 실제로 들어간 돈 (예금은 amount, 적금은 넣은 만큼) */
  readonly paidSoFar: number;
  /** 🔴 이번 주에 이미 넣었나 — 하루에 여러 번 넣어 만기를 앞당길 수 없다 */
  readonly paidThisWeek: boolean;
  /** 적금을 다 넣었나 */
  readonly fullyPaid: boolean;
  readonly amount: number;
  readonly months: number;
  readonly interestPct: number;
  /** 🔴 아이가 **바란** 이자율. 실제 적용은 `interestPct` 다 */
  readonly wantedPct: number | null;
  /** 보호자가 아이가 바란 것과 다르게 정했는가 — 화면이 그 사실을 말한다 */
  readonly differs: boolean;
  readonly state: "REQUESTED" | "ACTIVE" | "DONE" | "BROKEN" | "REJECTED";
  /** 만기에 받을 이자 — 🔴 지금 받은 게 아니다 */
  readonly interestWon: number;
  readonly maturesAt: Date | null;
  /** 만기까지 남은 날. 지났으면 0 */
  readonly daysLeft: number | null;
  readonly matured: boolean;
  readonly rejectReason: string | null;
};

const interestOf = (amount: number, pct: number) => Math.floor((amount * pct) / 100);

function toView(r: {
  id: string; goal: string; amount: number; months: number; interestPct: number;
  wantedPct: number | null; state: string; maturesAt: Date | null; rejectReason: string | null;
  kind: string; perPeriod: number | null; periods: number | null;
  paidCount: number; lastPaidAt: Date | null;
}): SavingsView {
  const left = r.maturesAt ? Math.ceil((r.maturesAt.getTime() - Date.now()) / 864e5) : null;
  const inst = r.kind === "INSTALLMENT";
  const paidSoFar = inst ? r.paidCount * (r.perPeriod ?? 0) : r.amount;
  // 🔴 한 주에 한 번만. 안 그러면 하루에 12번 눌러 만기를 앞당긴다
  const weekAgo = Date.now() - 7 * 864e5;
  return {
    id: r.id, goal: r.goal, amount: r.amount, months: r.months, interestPct: r.interestPct,
    kind: (inst ? "INSTALLMENT" : "DEPOSIT") as SavingsKind,
    perPeriod: r.perPeriod, periods: r.periods, paidCount: r.paidCount,
    paidSoFar,
    paidThisWeek: r.lastPaidAt !== null && r.lastPaidAt.getTime() > weekAgo,
    fullyPaid: inst ? r.paidCount >= (r.periods ?? 0) : true,
    wantedPct: r.wantedPct,
    differs: r.wantedPct !== null && r.wantedPct !== r.interestPct,
    state: r.state as SavingsView["state"],
    // 🔴 이자는 **실제로 넣은 돈** 기준이다. 약속만 하고 안 넣었는데 이자를 주면 안 된다
    interestWon: interestOf(paidSoFar, r.interestPct),
    maturesAt: r.maturesAt,
    daysLeft: left === null ? null : Math.max(0, left),
    matured: left !== null && left <= 0,
    rejectReason: r.rejectReason,
  };
}

const SELECT = {
  id: true, goal: true, amount: true, months: true, interestPct: true,
  wantedPct: true, state: true, maturesAt: true, rejectReason: true,
  kind: true, perPeriod: true, periods: true, paidCount: true, lastPaidAt: true,
} as const;

/** 지금 굴러가는 것 하나 — 🔴 한 번에 하나만 (DB 부분 유니크가 막는다) */
export async function getOpen(childId: string): Promise<SavingsView | null> {
  const r = await prisma.savingsPlan.findFirst({
    where: { childId, state: { in: ["REQUESTED", "ACTIVE"] } },
    select: SELECT,
  });
  return r ? toView(r) : null;
}

/** 끝난 것들 — 지킨 것과 깬 것을 함께 본다 */
export async function getClosed(childId: string, take = 5) {
  const rows = await prisma.savingsPlan.findMany({
    where: { childId, state: { in: ["DONE", "BROKEN", "REJECTED"] } },
    orderBy: { requestedAt: "desc" }, take, select: SELECT,
  });
  return rows.map(toView);
}

export type SavingsResult =
  | { ok: true }
  | { ok: false; reason: "ALREADY_OPEN" | "BAD_AMOUNT" | "BAD_MONTHS" | "BAD_GOAL" | "NOT_ENOUGH" | "NOT_FOUND" | "NO_RATE" | "PAID_THIS_WEEK" | "ALL_PAID" };

/**
 * 아이가 신청한다 — 🔴 **여기서 돈이 묶이지 않는다.** 보호자가 받아들여야 묶인다.
 *    신청만으로 묶으면 부모가 거절했을 때 아이 돈이 잠깐 사라진다.
 */
export async function request(
  childId: string, guardianId: string, goal: string, amount: number, months: number,
  /** 🔴 아이가 **바라는** 이자율. 정해지는 값이 아니다 — 보호자가 답한다 */
  wantedPct?: number,
  /** 예금(목돈 한 번) / 적금(매주 조금씩) */
  kind: SavingsKind = "DEPOSIT",
  /** 적금일 때 — 한 회 금액과 회차(주) */
  perPeriod?: number, periods?: number,
): Promise<SavingsResult> {
  const g = goal.trim();
  if (!g || g.length > 30) return { ok: false, reason: "BAD_GOAL" };
  if (await getOpen(childId)) return { ok: false, reason: "ALREADY_OPEN" };

  const inst = kind === "INSTALLMENT";
  let total: number;

  if (inst) {
    if (!Number.isFinite(perPeriod) || perPeriod! < MIN_PER_PERIOD) return { ok: false, reason: "BAD_AMOUNT" };
    if (!Number.isInteger(periods) || periods! < MIN_PERIODS || periods! > MAX_PERIODS) {
      return { ok: false, reason: "BAD_MONTHS" };
    }
    total = Math.floor(perPeriod!) * periods!;
    // 🔴 적금은 **첫 회만** 있으면 시작한다. 총액을 다 갖고 있어야 하면 그건 예금이다
    if ((await getBalance(childId)) < Math.floor(perPeriod!)) return { ok: false, reason: "NOT_ENOUGH" };
  } else {
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) return { ok: false, reason: "BAD_AMOUNT" };
    if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) return { ok: false, reason: "BAD_MONTHS" };
    total = Math.floor(amount);
    if ((await getBalance(childId)) < total) return { ok: false, reason: "NOT_ENOUGH" };
  }

  // 🔴 신청 시점 이자율을 박아 둔다. 뒤에 부모가 바꿔도 이 약속은 그대로다
  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: guardianId }, select: { savingsInterestPct: true },
  });
  const wanted = Number.isFinite(wantedPct) && wantedPct! >= 0 && wantedPct! <= MAX_PCT
    ? Math.floor(wantedPct!) : null;

  await prisma.savingsPlan.create({
    data: {
      childId, guardianId, goal: g, kind,
      amount: total,
      // 적금은 회차(주)로 기간이 정해진다 — 개월 수는 표시용으로 환산해 둔다
      months: inst ? Math.max(1, Math.round(periods! / 4)) : months,
      perPeriod: inst ? Math.floor(perPeriod!) : null,
      periods: inst ? periods! : null,
      interestPct: guardian?.savingsInterestPct ?? 0,
      wantedPct: wanted,
    },
  });
  return { ok: true };
}

/**
 * 보호자가 받아들인다 → 돈이 묶이고 ⭐1.
 * 🔴 잔액이 모자라면 시작하지 않는다. 신청 뒤에 아이가 다 써버렸을 수 있다.
 */
export async function accept(
  guardianId: string, planId: string,
  /** 🔴 이 약속에만 적용할 이자율. 아이가 더 바랐을 때 보호자가 답하는 자리다 */
  pct?: number,
): Promise<SavingsResult> {
  const p = await prisma.savingsPlan.findFirst({
    where: { id: planId, guardianId, state: "REQUESTED" },
    select: { id: true, childId: true, goal: true, amount: true, months: true,
              kind: true, perPeriod: true, periods: true },
  });
  if (!p) return { ok: false, reason: "NOT_FOUND" };

  // 🔴 예금은 전액을, 적금은 **첫 회만** 묶는다. 적금에서 전액을 묶으면 그건 예금이다
  const first = p.kind === "INSTALLMENT" ? (p.perPeriod ?? 0) : p.amount;
  const locked = await recordAllowance(
    p.childId, -first, "SAVINGS_LOCK", `${p.goal}에 넣었어요`, `savings-lock:${p.id}`,
  );
  if (!locked.ok) return { ok: false, reason: "NOT_ENOUGH" };

  const now = new Date();
  const matures = new Date(now);
  // 적금은 회차(주)만큼, 예금은 개월 수만큼
  if (p.kind === "INSTALLMENT") matures.setDate(matures.getDate() + 7 * (p.periods ?? 0));
  else matures.setMonth(matures.getMonth() + p.months);

  const finalPct = Number.isFinite(pct) && pct! >= 0 && pct! <= MAX_PCT ? Math.floor(pct!) : undefined;
  await prisma.savingsPlan.update({
    where: { id: p.id },
    data: { state: "ACTIVE", startedAt: now, maturesAt: matures,
            // 첫 회를 넣었으므로 1회로 시작한다
            paidCount: p.kind === "INSTALLMENT" ? 1 : 0, lastPaidAt: now,
            ...(finalPct === undefined ? {} : { interestPct: finalPct }) },
  });
  await grantStar({
    childId: p.childId, triggerCode: "SAVINGS_JOINED", delta: 1,
    idempotencyKey: `savings-join:${p.id}`,
  });
  return { ok: true };
}

export async function reject(guardianId: string, planId: string, reason: string): Promise<SavingsResult> {
  const r = await prisma.savingsPlan.updateMany({
    where: { id: planId, guardianId, state: "REQUESTED" },
    data: { state: "REJECTED", closedAt: new Date(), rejectReason: reason.trim() || null },
  });
  return r.count === 1 ? { ok: true } : { ok: false, reason: "NOT_FOUND" };
}

/**
 * 「이번 주 넣기」 — 적금에만 있다. 🔴 **아이가 직접 넣는다.**
 *
 * 🔴 자동 이체로 만들지 않았다. 자동이면 아이가 아무것도 안 해도 되고, 그러면
 *    **실천이 아니다.** 매주 넣는 행동 자체가 「조금씩 꾸준히」를 배우는 방법이다.
 * 🔴 **한 주에 한 번만.** 안 그러면 하루에 열두 번 눌러 만기를 앞당긴다.
 * 🔴 용돈이 모자라면 못 넣는다. 이번 주를 건너뛰어도 **회차는 그대로 남는다** —
 *    없어지지 않는다. 다음 주에 넣으면 된다.
 */
export async function payInstallment(childId: string, planId: string): Promise<SavingsResult> {
  const p = await prisma.savingsPlan.findFirst({
    where: { id: planId, childId, state: "ACTIVE", kind: "INSTALLMENT" },
    select: { id: true, goal: true, perPeriod: true, periods: true, paidCount: true, lastPaidAt: true },
  });
  if (!p) return { ok: false, reason: "NOT_FOUND" };
  if (p.paidCount >= (p.periods ?? 0)) return { ok: false, reason: "ALL_PAID" };
  if (p.lastPaidAt && p.lastPaidAt.getTime() > Date.now() - 7 * 864e5) {
    return { ok: false, reason: "PAID_THIS_WEEK" };
  }

  const next = p.paidCount + 1;
  const moved = await recordAllowance(
    childId, -(p.perPeriod ?? 0), "SAVINGS_LOCK",
    `${p.goal}에 ${next}번째로 넣었어요`, `savings-pay:${p.id}:${next}`,
  );
  if (!moved.ok) return { ok: false, reason: "NOT_ENOUGH" };

  await prisma.savingsPlan.update({
    where: { id: p.id }, data: { paidCount: next, lastPaidAt: new Date() },
  });
  return { ok: true };
}

/**
 * 만기 — 원금 + 이자가 돌아오고 ⭐10.
 * 🔴 **만기 전에는 안 된다.** 날짜를 안 보면 아이가 바로 눌러 ⭐10을 받는다.
 * 🔴 ⭐10은 SRS 가 정한 값이다 — 오래 지킨 것에 큰 보상을 준다.
 */
export async function complete(guardianId: string, planId: string): Promise<SavingsResult> {
  const p = await prisma.savingsPlan.findFirst({
    where: { id: planId, guardianId, state: "ACTIVE" },
    select: { id: true, childId: true, goal: true, amount: true, interestPct: true, maturesAt: true,
              kind: true, perPeriod: true, periods: true, paidCount: true },
  });
  if (!p) return { ok: false, reason: "NOT_FOUND" };
  // 🔴 적금은 **다 넣었으면 만기 전이라도** 끝낼 수 있다. 12주치를 다 넣었는데
  //    날짜만 기다리게 하면 아이는 왜 기다리는지 모른다
  const inst = p.kind === "INSTALLMENT";
  const allPaid = inst && p.paidCount >= (p.periods ?? 0);
  const dateReached = !p.maturesAt || p.maturesAt.getTime() <= Date.now();
  if (!dateReached && !allPaid) return { ok: false, reason: "NOT_FOUND" };

  // 🔴 **실제로 넣은 만큼만** 돌려준다. 약속만 하고 안 넣은 회차는 없는 돈이다
  const principal = inst ? p.paidCount * (p.perPeriod ?? 0) : p.amount;
  const interest = interestOf(principal, p.interestPct);
  await recordAllowance(
    p.childId, principal + interest, "SAVINGS_RELEASE",
    interest > 0 ? `${p.goal}이 끝났어요 (이자 ${interest.toLocaleString("ko-KR")}원)` : `${p.goal}이 끝났어요`,
    `savings-release:${p.id}`,
  );
  await prisma.savingsPlan.update({
    where: { id: p.id }, data: { state: "DONE", closedAt: new Date() },
  });
  await grantStar({
    childId: p.childId, triggerCode: "SAVINGS_DONE", delta: 10,
    idempotencyKey: `savings-done:${p.id}`,
  });
  return { ok: true };
}

/**
 * 🔴 **아이가 중간에 깬다.** 원금만 돌아오고 **이자는 없다** — 별도 없다.
 *    두 공개 자료가 「만기 전에 찾으면 약속한 이자를 다 못 받는다」를 가르친다.
 *    그대로 겪게 하는 것이 이 기능의 학습 가치다. 막지 않는다 — 아이 돈이다.
 */
export async function breakEarly(childId: string, planId: string): Promise<SavingsResult> {
  const p = await prisma.savingsPlan.findFirst({
    where: { id: planId, childId, state: "ACTIVE" },
    select: { id: true, goal: true, amount: true, kind: true, perPeriod: true, paidCount: true },
  });
  if (!p) return { ok: false, reason: "NOT_FOUND" };

  // 넣은 만큼만 돌아온다 — 이자는 없다
  const principal = p.kind === "INSTALLMENT" ? p.paidCount * (p.perPeriod ?? 0) : p.amount;
  await recordAllowance(
    childId, principal, "SAVINGS_RELEASE", `${p.goal}을 중간에 깼어요 (이자 없음)`,
    `savings-release:${p.id}`,
  );
  await prisma.savingsPlan.update({
    where: { id: p.id }, data: { state: "BROKEN", closedAt: new Date() },
  });
  return { ok: true };
}

/** 보호자 화면이 읽는 목록 — 신청 대기와 진행 중을 함께 준다 */
export async function listForGuardian(guardianId: string) {
  const rows = await prisma.savingsPlan.findMany({
    where: { guardianId, state: { in: ["REQUESTED", "ACTIVE"] } },
    orderBy: [{ state: "asc" }, { requestedAt: "asc" }],
    select: SELECT,
  });
  const views = rows.map(toView);
  return {
    requested: views.filter((v) => v.state === "REQUESTED"),
    active: views.filter((v) => v.state === "ACTIVE"),
  };
}

/** 지금 우리 집 이자 — 받아들이기 폼의 기본값 */
export async function houseRate(guardianId: string) {
  const g = await prisma.guardianAccount.findUnique({
    where: { id: guardianId }, select: { savingsInterestPct: true },
  });
  return g?.savingsInterestPct ?? null;
}
