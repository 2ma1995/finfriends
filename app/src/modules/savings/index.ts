import "server-only";
import { prisma } from "@/db";
import { notifyOnce } from "@/modules/notification";
import { grantStar } from "@/modules/star-ledger";

/** 실천이 귀속되는 주기 — 벌기·잘 쓰기·모으기와 같은 달 단위다 (§6.2.1) */
const cycleOf = (d: Date) => d.getFullYear() * 100 + (d.getMonth() + 1);
import { getBalance, record as recordAllowance } from "@/modules/allowance";
import { eul, i } from "@/lib/korean";

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
/**
 * 🔴 **이자율에 상한을 두지 않는다** (2026-09-03 사용자 결정).
 *
 *    한동안 `MAX_PCT = 20` 이 있었는데 **근거가 어디에도 없었다** —
 *    SRS 에도, `D25` 에도, 주석에도. 이 파일에서 근거가 안 적힌 유일한 상수였다.
 *
 * 🔴 그리고 **엉뚱한 숫자에 걸려 있었다.** 상한이 «기간» 이율에 붙는데
 *    화면은 «연 환산»을 보여준다 — 1개월 20%는 연 240%다.
 *    막는 값과 보여주는 값이 서로 달랐고, 12개월 적금에서만 우연히 맞았다.
 *
 * 🔴 **부모 돈이고 부모 집 약속이다.** 앱이 집안 약속의 액수를 정하지 않는다.
 *    대신 부모가 판단할 재료를 준다 — 화면이 **연 환산**과
 *    **시중 3.40~7.00% · Greenlight 19.84%** 를 나란히 놓는다 (`FR-031`).
 *
 * 🔴 **음수는 여전히 막는다.** 그건 상한이 아니라 부호다 —
 *    이자가 음수면 만기에 아이 돈이 줄어든다. 「불리기」가 아니다.
 */

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
/**
 * 🔴 **한 번에 세 개까지 한다** (사용자 결정 · 예전엔 하나였다).
 *
 * 셋으로 정한 이유는 **적금은 매주 넣어야 하기 때문**이다. 개수가 늘수록 지킬 일이
 * 늘고, 하나만 잊어도 그게 실패로 남는다 — 「약속하고 지키기」를 배우는 자리에서
 * 지킬 수 없는 개수를 열어 주면 배우는 것이 실패뿐이다.
 *
 * 🔴 **종류를 안 가린다.** 예금 셋도 되고 적금 셋도 된다. 갈라 세면
 *    「예금 3 + 적금 3 = 여섯」이 되어 셋으로 제한한 뜻이 없어진다.
 */
export const MAX_OPEN = 3;

/** 지금 살아 있는 저금 전부 — 신청 중과 진행 중을 함께 본다 */
export async function listOpen(childId: string): Promise<SavingsView[]> {
  const rows = await prisma.savingsPlan.findMany({
    where: { childId, state: { in: ["REQUESTED", "ACTIVE"] } },
    orderBy: { requestedAt: "asc" },
    select: SELECT,
  });
  return rows.map(toView);
}

/** 🔴 **한 개만 필요한 자리**가 아직 있다(실천 칸). 첫 것을 준다 */
export async function getOpen(childId: string): Promise<SavingsView | null> {
  const [first] = await listOpen(childId);
  return first ?? null;
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
  | { ok: false; reason: "ALREADY_OPEN" | "BAD_AMOUNT" | "BAD_MONTHS" | "BAD_GOAL" | "NOT_ENOUGH" | "NOT_FOUND" | "NO_RATE" | "PAID_THIS_WEEK" | "ALL_PAID" | "BAD_PCT" };

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
  // 🔴 **서버가 센다.** 화면이 폼을 감춰도 주소만 알면 던질 수 있다 (§6.6)
  if ((await listOpen(childId)).length >= MAX_OPEN) return { ok: false, reason: "ALREADY_OPEN" };

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

  /**
   * 🔴 신청 시점 이자율을 박아 둔다. 뒤에 부모가 바꿔도 이 약속은 그대로다.
   *
   * 🔴 **아직 정해진 이자율이 없어도 신청은 된다.** 예전엔 없으면 화면이 신청을
   *    막았는데, 이자율을 정하는 칸이 통장에서 없어지면서 **새 집은 영영 신청을
   *    못 하는 잠금**이 됐다 — 신청이 없으니 승인도 없고, 승인이 없으니 기본값도 안 생긴다.
   *    0 으로 시작하고 **보호자가 받아들일 때 정한다.**
   */
  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: guardianId }, select: { savingsInterestPct: true },
  });
  // 🔴 아이는 `WANTED_CHOICES` 에서 고른다. 음수만 막으면 된다 — 상한은 없앴다
  const wanted = Number.isFinite(wantedPct) && wantedPct! >= 0
    ? Math.floor(wantedPct!) : null;

  const created = await prisma.savingsPlan.create({
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

  /**
   * 🔴 **부모가 안 누르면 아이가 못 나아간다** (어긋남 대장 D75 · 사용자 지적 —
   *    「아이가 무슨 행동을 했을 때 알림이 왜 안 와?」).
   *
   *    예전엔 알림이 «미션»에만 붙어 있었다. 적금 신청은 부모 승인이 있어야
   *    시작되는데 알릴 길이 없어서, 부모가 우연히 「우리 집 저금」 화면을 열어야
   *    보였다. 아이는 신청해 놓고 기다리는데 부모는 온 줄도 모르는 상태였다.
   *
   * 🔴 **약속 id 로 묶는다.** 같은 신청으로 두 번 알리지 않는다.
   * 🔴 **금액·아이 이름을 본문에 넣지 않는다.** 잠금화면에 뜨는 글이다.
   */
  await notifyOnce(
    guardianId, "SAVINGS_REQUESTED", created.id,
    "저금 약속을 신청했어요",
    "아이가 예금·적금을 신청했어요. 확인하고 받아 주세요.",
  );

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

  /**
   * 🔴 **범위 밖 이자율을 조용히 무시하지 않는다** (어긋남 대장 D66).
   *
   *    예전엔 아래에서 `finalPct = … ? Math.floor(pct) : undefined` 로 떨어뜨렸다.
   *    보호자가 50% 를 넣으면 **「승인됐어요」가 뜨는데 실제로는 기본 이율로 체결**됐다.
   *    아무도 모른다 — 아이 저금 이율이 부모 의도와 다르게 박히고 만기에 돈이 나간다.
   *    **조용한 실패보다 조용한 «다른 결과»가 나쁘다.**
   *
   * 🔴 **돈이 움직이기 전에 본다.** 아래 `recordAllowance` 가 첫 회를 묶으므로,
   *    검사가 그 뒤에 오면 거절해도 돈은 이미 빠져 있다.
   *
   * 🔴 `undefined` 는 그대로 통과시킨다 — 「칸이 아예 없다」는 **안 바꾼다**는 뜻이고,
   *    그건 잘못된 값이 아니다.
   */
  // 🔴 상한은 없다(위 주석). 음수와 숫자가 아닌 것만 막는다
  if (pct !== undefined && (!Number.isFinite(pct) || pct < 0)) {
    return { ok: false, reason: "BAD_PCT" };
  }

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

  // 🔴 범위는 위에서 이미 봤다. 여기 남은 일은 「안 바꾼다」와 정수화뿐이다
  const finalPct = pct === undefined ? undefined : Math.floor(pct);

  /**
   * 🔴 **이 값이 그 집의 기본 이자율이 된다.** 통장의 이자율 설정 칸을 없앴기 때문에
   *    (같은 값을 두 곳에서 정하면 갈린다) 여기가 유일한 갱신 지점이다.
   *    안 남기면 다음 신청도 0% 로 올라오고 아이 화면에 「우리 집 이자 0%」가 뜬다.
   */
  if (finalPct !== undefined) {
    await prisma.guardianAccount.update({
      where: { id: guardianId }, data: { savingsInterestPct: finalPct },
    });
  }
  await prisma.savingsPlan.update({
    where: { id: p.id },
    data: { state: "ACTIVE", startedAt: now, maturesAt: matures,
            // 첫 회를 넣었으므로 1회로 시작한다
            paidCount: p.kind === "INSTALLMENT" ? 1 : 0, lastPaidAt: now,
            ...(finalPct === undefined ? {} : { interestPct: finalPct }) },
  });
  /**
   * 🔴 **별만 주고 실천으로는 안 세고 있었다.** `practice_credits` 에 `GROW` 가
   *    **0건**이라 불리기 나무의 실천 조건이 **영원히 0**이었다 —
   *    `ADR-006` 이 「실천 0이면 학습·퀴즈를 넘쳐도 승급 못 한다」이므로
   *    불리기 나무는 **아무리 배워도 씨앗에서 못 벗어났다.**
   *
   * 🔴 **불리기의 실천은 저금이 유일하다** (`D25`). 미션으로는 못 하고,
   *    실제 금융상품 없이 인정할 수 있는 행동이 「약속하고 지키는 것」뿐이다.
   */
  const now2 = new Date();
  const joinCredit = await prisma.practiceCredit.create({
    data: {
      childId: p.childId, triggerCode: "SAVINGS_JOINED", triggerPath: "PRACTICE",
      topic: "GROW", approvalMode: "guardian",
      earnedAt: now2, awardedAt: now2, cycleId: cycleOf(now2),
    },
  });
  await grantStar({
    childId: p.childId, triggerCode: "SAVINGS_JOINED", delta: 1,
    idempotencyKey: `savings-join:${p.id}`, practiceId: joinCredit.id,
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
    interest > 0 ? `${i(p.goal)} 끝났어요 (이자 ${interest.toLocaleString("ko-KR")}원)` : `${i(p.goal)} 끝났어요`,
    `savings-release:${p.id}`,
  );
  await prisma.savingsPlan.update({
    where: { id: p.id }, data: { state: "DONE", closedAt: new Date() },
  });
  /**
   * 🔴 **완주도 실천이다.** 가입은 「시작했다」이고 완주는 「끝까지 지켰다」다 —
   *    불리기가 가르치려는 것이 후자이므로 ⭐10 이 붙는다 (`REQ-FUNC-014`).
   *
   * 🔴 **깬 것은 실천이 아니다.** `breakEarly` 에는 이것도 별도 없다 —
   *    「만기 전에 찾으면 약속한 이자를 다 못 받는다」를 겪게 하는 것이 학습 가치다.
   */
  const doneAt = new Date();
  const doneCredit = await prisma.practiceCredit.create({
    data: {
      childId: p.childId, triggerCode: "SAVINGS_DONE", triggerPath: "PRACTICE",
      topic: "GROW", approvalMode: "guardian",
      earnedAt: doneAt, awardedAt: doneAt, cycleId: cycleOf(doneAt),
    },
  });
  await grantStar({
    childId: p.childId, triggerCode: "SAVINGS_DONE", delta: 10,
    idempotencyKey: `savings-done:${p.id}`, practiceId: doneCredit.id,
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
    childId, principal, "SAVINGS_RELEASE", `${eul(p.goal)} 중간에 깼어요 (이자 없음)`,
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
