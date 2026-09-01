import "server-only";
import { prisma } from "@/db";

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

export const MAX_TOPUP = 500_000;

export type AllowanceEntryView = {
  readonly id: string;
  readonly delta: number;
  readonly memo: string;
  readonly whenLabel: string;
  readonly code: string;
  /** 보호자가 적은 줄인가 — 되돌릴 수 있는 것은 이것뿐이다 */
  readonly byGuardian: boolean;
  readonly reversed: boolean;
};

export async function getBalance(childId: string) {
  const agg = await prisma.allowanceEntry.aggregate({ where: { childId }, _sum: { delta: true } });
  return agg._sum.delta ?? 0;
}

function whenLabel(at: Date, now = new Date()) {
  const days = Math.floor((now.getTime() - at.getTime()) / 864e5);
  return days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
}

const LABEL: Record<string, string> = {
  TOPUP: "용돈을 받았어요",
  WISH_SET_ASIDE: "목표에 넣었어요",
  WISH_RELEASE: "목표에서 되돌렸어요",
  PLAN_SPEND: "썼어요",
  ADJUST: "고쳤어요",
};

export async function getHistory(childId: string, take = 20): Promise<AllowanceEntryView[]> {
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
    whenLabel: whenLabel(r.createdAt),
    code: r.code,
    byGuardian: r.code === "TOPUP" || r.code === "ADJUST",
    reversed: undone.has(r.id),
  }));
}

export type MoveResult =
  | { ok: true; balance: number; duplicated: boolean }
  | { ok: false; reason: "NOT_ENOUGH" | "BAD_AMOUNT" };

type Code = "TOPUP" | "WISH_SET_ASIDE" | "WISH_RELEASE" | "PLAN_SPEND" | "ADJUST";

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
  if (e.code !== "TOPUP" && e.code !== "ADJUST") return { ok: false, reason: "NOT_ALLOWED" };

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

export type PassbookView = {
  readonly balance: number;
  /** 목표에 넣어 둔 돈 — 이자가 붙는 대상 */
  readonly savedWon: number;
  /** 🔴 보호자가 정한 이자율. 없으면 아직 안 정한 것이다 */
  readonly interestPct: number | null;
  /** 🔴 **아직 받은 게 아니다.** 지금 기준으로 「한 번 줄 때」 얼마인지만 보여준다 */
  readonly interestWon: number;
  readonly card: CardStage;
  readonly history: readonly AllowanceEntryView[];
};

export async function getPassbook(
  childId: string, guardianId: string,
): Promise<PassbookView> {
  const [balance, history, saved, guardian] = await Promise.all([
    getBalance(childId),
    getHistory(childId, 30),
    prisma.wishlist.aggregate({ where: { childId }, _sum: { savedAmount: true } }),
    // 🔴 조인이 아니라 별도 조회다. 두 스키마를 코드에서 합친다
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { savingsInterestPct: true, mockCardStatus: true },
    }),
  ]);

  const savedWon = saved._sum.savedAmount ?? 0;
  const pct = guardian?.savingsInterestPct ?? null;

  return {
    balance, savedWon, interestPct: pct,
    interestWon: pct === null ? 0 : Math.floor((savedWon * pct) / 100),
    card: (guardian?.mockCardStatus as CardStage) ?? "NONE",
    history,
  };
}
