import "server-only";
import { prisma } from "@/db";
import { exactWhen, relativeWhen } from "@/lib/when";
import { MAX_TOPUP } from "@/contracts/bank";

/**
 * 용돈 장부 — 어긋남 대장 D18.
 *
 * 🔴 **앱은 돈을 보관하지 않는다.** 실제 돈은 앱 밖(부모 카드·현금)에 있다.
 *    여기는 「얼마 줬고 얼마 남았나」를 적는 **장부**다. 앱이 가치를 보관하면
 *    선불전자지급수단이 되어 전자금융업 등록 대상이 된다 — 아동 명의까지 겹친다.
 *
 * 🔴 **별과 섞이지 않는다** (P-21 · REQ-NF-010 · S4).
 *    이 파일은 `@/modules/star-ledger` 를 **부르지 않는다.** 두 원장 사이에 전환 함수를
 *    두지 않는 것이 규제 요건이고, 그 사실이 import 목록에서 바로 보여야 한다.
 *
 * 🔴 **잔액을 따로 저장하지 않는다.** 별 원장과 같은 규율 — 합이 잔액이다.
 */

/** 🔴 계약에서 가져온다 — 화면도 같은 숫자를 본다. 다시 여기 적으면 갈린다 */
export { MAX_TOPUP } from "@/contracts/bank";

export type AllowanceEntryView = {
  readonly id: string;
  readonly delta: number;
  readonly memo: string;
  readonly whenLabel: string;
  readonly code: string;
  /** 보호자가 적은 줄인가 — 되돌릴 수 있는 것은 이것뿐이다 */
  readonly byGuardian: boolean;
  /**
   * 🔴 **되돌릴 수 있는가 — 판정을 여기서 한다.** 화면이 조건을 다시 조립하면
   *    서버(`reverseEntry`)와 어긋난다. 실제로 어긋나 있었다 —
   *    화면은 「부모가 적은 것」을 보였고 서버는 `ADJUST` 도 받아 줘서
   *    **상쇄 줄을 또 되돌릴 수 있었다.**
   */
  readonly reversible: boolean;
  readonly reversed: boolean;
};

export async function getBalance(childId: string) {
  const agg = await prisma.allowanceEntry.aggregate({ where: { childId }, _sum: { delta: true } });
  return agg._sum.delta ?? 0;
}



/** 🔴 목표로 옮긴 것은 **쓴 게 아니다.** 같은 「나감」으로 보이면 아이가 없어진 줄 안다 */
export const MOVED_CODES = ["WISH_SET_ASIDE", "WISH_RELEASE", "SAVINGS_LOCK", "SAVINGS_RELEASE"];

const LABEL: Record<string, string> = {
  TOPUP: "용돈을 받았어요",
  WISH_SET_ASIDE: "목표에 넣었어요",
  WISH_RELEASE: "목표에서 되돌렸어요",
  PLAN_SPEND: "썼어요",
  ADJUST: "고쳤어요",
  SAVINGS_LOCK: "적금에 넣었어요",
  SAVINGS_RELEASE: "적금이 끝났어요",
};

/**
 * 원장 목록.
 *
 * 🔴 **「언제」의 모양을 부르는 쪽이 고른다** (2026-09-01 사용자 지적 · D59).
 *
 *    - `"relative"` — 「오늘 · 어제 · 3일 전」. **아이 화면**이 쓴다.
 *      얼마나 지났는지가 아이에게 필요한 정보다.
 *    - `"exact"` — 「오늘 14:32」. **부모가 줄을 고르는 화면**이 쓴다.
 *      되돌릴 줄을 고르는데 셋 다 「오늘」이면 어느 것인지 알 수 없다.
 *
 *    🔴 기본은 `"relative"` 다. 아이 화면(`getPassbook`)이 이 함수를 부르므로
 *       기본을 `"exact"` 로 두면 **아이에게 시각이 새어 나간다.**
 */
export async function getHistory(
  childId: string, take = 20, when: "relative" | "exact" = "relative",
): Promise<AllowanceEntryView[]> {
  const [rows, undone] = await Promise.all([
    prisma.allowanceEntry.findMany({
      where: { childId }, orderBy: { createdAt: "desc" }, take,
      select: { id: true, delta: true, memo: true, code: true, createdAt: true },
    }),
    reversedKeys(childId),
  ]);
  return rows.map((r) => ({
    id: r.id, delta: r.delta,
    memo: r.memo ?? LABEL[r.code] ?? "",
    whenLabel: when === "exact" ? exactWhen(r.createdAt) : relativeWhen(r.createdAt),
    code: r.code,
    byGuardian: r.code === "TOPUP" || r.code === "ADJUST",
    reversible: r.code === "TOPUP" && !undone.has(r.id),
    reversed: undone.has(r.id),
  }));
}

export type MoveResult =
  | { ok: true; balance: number; duplicated: boolean }
  | { ok: false; reason: "NOT_ENOUGH" | "BAD_AMOUNT" };

type Code =
  | "TOPUP" | "WISH_SET_ASIDE" | "WISH_RELEASE" | "PLAN_SPEND" | "ADJUST"
  | "SAVINGS_LOCK" | "SAVINGS_RELEASE";

/**
 * 장부에 한 줄 적는다.
 *
 * 🔴 **잔액이 0 밑으로 내려가지 않는다.** 아이가 없는 돈을 쓴 것으로 적으면
 *    장부가 현실과 어긋나고, 그때부터 이 화면은 아무 의미가 없다.
 * 🔴 **중복은 정상 경로다.** 오프라인 큐가 두 번 보내도 한 번만 적힌다 (REQ-NF-003).
 */
export async function record(
  childId: string, delta: number, code: Code, memo: string, idempotencyKey: string,
): Promise<MoveResult> {
  if (!Number.isFinite(delta) || delta === 0) return { ok: false, reason: "BAD_AMOUNT" };

  return prisma.$transaction(async (tx) => {
    const agg = await tx.allowanceEntry.aggregate({ where: { childId }, _sum: { delta: true } });
    const balance = agg._sum.delta ?? 0;
    const next = balance + Math.floor(delta);
    if (next < 0) return { ok: false, reason: "NOT_ENOUGH" } as const;

    try {
      await tx.allowanceEntry.create({
        data: { childId, delta: Math.floor(delta), code, memo, idempotencyKey, balanceAfter: next },
      });
      return { ok: true, balance: next, duplicated: false } as const;
    } catch (e) {
      // 이미 적힌 것 — 오류가 아니다
      if ((e as { code?: string }).code === "P2002") {
        return { ok: true, balance, duplicated: true } as const;
      }
      throw e;
    }
  });
}

/** 보호자가 용돈을 줬다고 적는다 — 실제 돈은 앱 밖에서 오간다 */
export async function topUp(childId: string, amount: number, memo: string, key: string) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TOPUP) {
    return { ok: false, reason: "BAD_AMOUNT" } as const;
  }
  return record(childId, amount, "TOPUP", memo || "용돈을 받았어요", key);
}

/**
 * 잘못 적은 줄을 되돌린다 — 🔴 **줄을 고치거나 지우지 않는다.**
 *    고치면 「합이 잔액」이 깨지고, 왜 이렇게 됐는지 아무도 못 본다.
 *    회계와 같이 **상쇄하는 줄을 새로 적는다.**
 *
 * 🔴 **보호자가 적은 줄만 되돌린다** (TOPUP · ADJUST).
 *    아이가 한 것(목표에 넣기·쓰기)은 아이 쪽 흐름에서 되돌린다 — 보호자가 아이 기록을
 *    임의로 지우면 아이는 자기 장부를 믿을 수 없게 된다.
 *
 * 🔴 **되돌릴 수 있는 만큼만 되돌린다.** 20,000원을 잘못 줬는데 아이가 이미 15,000원을
 *    목표에 넣었다면 5,000원만 돌아온다. 그대로 상쇄하면 잔액이 마이너스가 되고,
 *    그때부터 아이 화면은 거짓말을 시작한다. **얼마가 왜 안 돌아왔는지 그대로 말한다.**
 */
export type AdjustResult =
  | { ok: true; reversed: number; short: number }
  | { ok: false; reason: "NOT_FOUND" | "NOT_ALLOWED" | "ALREADY" | "NOTHING" };

export async function reverseEntry(childId: string, entryId: string, reason: string): Promise<AdjustResult> {
  const e = await prisma.allowanceEntry.findFirst({
    where: { id: entryId, childId },
    select: { id: true, delta: true, code: true, memo: true },
  });
  if (!e) return { ok: false, reason: "NOT_FOUND" };
  /**
   * 🔴 **`TOPUP` 만 되돌린다** (2026-09-01 사용자 요청).
   *
   *    전에는 `ADJUST` 도 받았다. 그래서 「부모님이 고쳤어요」를 **또 되돌릴 수** 있었고,
   *    아이 통장이 「받았다 → 취소 → 취소취소」로 읽혔다. 상쇄의 상쇄는 아무도 못 읽는다.
   *
   *    잘못 되돌렸으면 **용돈을 다시 넣는다.** 그게 아이 통장에 바르게 읽히는 방법이다.
   *
   *    🔴 화면이 버튼을 안 보여도 여기서 막는다 — Server Action 은 공개 엔드포인트다 (§6.6 ②).
   */
  if (e.code !== "TOPUP") return { ok: false, reason: "NOT_ALLOWED" };

  const key = `adjust:${e.id}`;
  const already = await prisma.allowanceEntry.findUnique({ where: { idempotencyKey: key }, select: { id: true } });
  if (already) return { ok: false, reason: "ALREADY" };

  const balance = await getBalance(childId);
  const want = -e.delta;
  // 되돌리면 잔액이 0 밑으로 갈 때는 있는 만큼만
  const applied = want < 0 ? -Math.min(balance, -want) : want;
  if (applied === 0) return { ok: false, reason: "NOTHING" };

  const note = reason.trim() ? `부모님이 고쳤어요 — ${reason.trim()}` : "부모님이 고쳤어요";
  const r = await record(childId, applied, "ADJUST", note, key);
  if (!r.ok) return { ok: false, reason: "NOTHING" };

  return { ok: true, reversed: Math.abs(applied), short: Math.abs(want) - Math.abs(applied) };
}

/** 이 줄을 되돌릴 수 있는가 — 화면이 버튼을 보일지 정한다 */
export async function reversedKeys(childId: string) {
  const rows = await prisma.allowanceEntry.findMany({
    where: { childId, code: "ADJUST", idempotencyKey: { startsWith: "adjust:" } },
    select: { idempotencyKey: true },
  });
  return new Set(rows.map((r) => r.idempotencyKey.slice("adjust:".length)));
}

/**
 * ── 아이 통장 ──────────────────────────────────────────
 *
 * 🔴 **아이도 자기 통장을 봐야 한다.** 보호자 화면(`/parent/bank`)에는 카드 상태와
 *    이자가 있는데 아이 화면에는 없었다. 「불리기」에서 **이자를 배우는데 정작 자기
 *    이자를 못 보면** 그 학습은 남의 이야기로 끝난다.
 *
 * 🔴 **결합 조회를 하지 않는다** (REQ-NF-009 · S3). 보호자 행은 `guardianId` 로 **따로**
 *    읽어 애플리케이션 계층에서 합친다 — Prisma 관계를 타지 않는다 (ADR-T03).
 */

export type CardStage = "NONE" | "REQUESTED" | "VERIFIED" | "SHIPPING" | "ACTIVE";

/**
 * 🔴 **잔액이 두 개다.** 목표에 떼어 둔 돈은 **쓴 게 아니라 묶인 것**이다.
 *    원장 합만 보면 「8,000원이 사라진」 것처럼 보인다 — 부모 화면과 아이 화면이
 *    다른 숫자를 말하게 된 원인이 이것이었다.
 *
 *    실제 통장도 「출금가능금액」과 「잔액」이 다르다. 같은 구분이다.
 *
 * 🔴 **부모 화면도 이 함수를 써야 한다.** 각자 세면 또 갈린다.
 */
export type WalletTotals = {
  /** 지금 바로 쓸 수 있는 돈 — 원장의 합 */
  readonly free: number;
  /** 목표에 떼어 둔 돈 — 여전히 아이 돈이다 */
  readonly setAside: number;
  /** 🔴 적금으로 묶인 돈 — 이것도 아이 돈이다. 만기까지 못 꺼낼 뿐이다 */
  readonly locked: number;
  /** 아이가 가진 돈 전체 */
  readonly total: number;
};

export async function getWalletTotals(childId: string): Promise<WalletTotals> {
  const [free, saved, savings] = await Promise.all([
    getBalance(childId),
    prisma.wishlist.aggregate({ where: { childId }, _sum: { savedAmount: true } }),
    // 🔴 **실제로 넣은 만큼**만 묶인 돈이다. 적금 약속 총액을 세면 아직 안 낸 돈까지 잡힌다
    prisma.savingsPlan.findMany({
      where: { childId, state: "ACTIVE" },
      select: { kind: true, amount: true, perPeriod: true, paidCount: true },
    }),
  ]);
  const setAside = saved._sum.savedAmount ?? 0;
  const locked = savings.reduce(
    (n, s) => n + (s.kind === "INSTALLMENT" ? s.paidCount * (s.perPeriod ?? 0) : s.amount), 0);
  return { free, setAside, locked, total: free + setAside + locked };
}

export type PassbookView = {
  /** 지금 바로 쓸 수 있는 돈 */
  readonly balance: number;
  /** 적금으로 묶인 돈 */
  readonly locked: number;
  /** 🔴 가진 돈 전체 = 쓸 수 있는 돈 + 목표에 떼어 둔 돈 + 적금 */
  readonly total: number;
  /** 목표에 넣어 둔 돈 — 이자가 붙는 대상 */
  readonly savedWon: number;
  /**
   * 🔴 **우리 집 이자율.** 이 값은 **적금·예금에만** 붙는다 (`modules/savings`).
   *
   *    예전엔 이 값을 **위시리스트에 넣어 둔 돈에 곱해** 「지금이면 400원」이라고 보여줬다.
   *    근거가 없었다 — `REQ-FUNC-012`(위시리스트)는 30·70·100% ⭐1 뿐이고 이자가 없다.
   *    「보호자는 위시리스트 목표에 이자를 준다」는 **§10.1 A3 [검증 대기] 가정**이지
   *    만들라는 요구가 아니다. **지급 경로가 없어서 아이는 영원히 못 받는다.**
   */
  readonly interestPct: number | null;
  readonly card: CardStage;
  readonly history: readonly AllowanceEntryView[];
};

export async function getPassbook(
  childId: string, guardianId: string,
): Promise<PassbookView> {
  const [totals, history, guardian] = await Promise.all([
    getWalletTotals(childId),
    getHistory(childId, 30),
    // 🔴 조인이 아니라 별도 조회다. 두 스키마를 코드에서 합친다
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { savingsInterestPct: true, mockCardStatus: true },
    }),
  ]);

  const pct = guardian?.savingsInterestPct ?? null;
  const savedWon = totals.setAside;

  return {
    balance: totals.free, savedWon, locked: totals.locked, total: totals.total, interestPct: pct,
    card: (guardian?.mockCardStatus as CardStage) ?? "NONE",
    history,
  };
}
