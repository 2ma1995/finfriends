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
  const rows = await prisma.allowanceEntry.findMany({
    where: { childId }, orderBy: { createdAt: "desc" }, take,
    select: { id: true, delta: true, memo: true, code: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id, delta: r.delta,
    memo: r.memo ?? LABEL[r.code] ?? "",
    whenLabel: whenLabel(r.createdAt),
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
