import "server-only";
import { prisma } from "@/db";
import { categoryOf } from "@/contracts/plan";

/**
 * 카드 거래 내역 — 어긋남 대장 D19.
 *
 * 🔴 **아직 실제 연동이 아니다.** `source = MOCK` 인 줄만 들어온다 (`prisma/seed-card.mjs`).
 *    실제 연동(`DAT-004`)은 제휴 카드사가 발급하고 **자금은 카드사가 보관**한다 —
 *    앱은 내역만 받는다. 그래야 D18 의 선(앱은 돈을 보관하지 않는다)이 유지된다.
 *
 * 🔴 **손입력을 대체하지 않는다.** 두 공개 자료가 가장 강조하는 실천이 **용돈기입장 쓰기**다.
 *    카드가 자동으로 적어 주면 그 학습이 사라진다. 여기는 **대조용**이다 —
 *    아이가 적은 금액과 실제가 다를 때 그 차이를 보는 것이 좋은 학습 장면이다.
 */

export type CardTxnView = {
  readonly id: string;
  readonly amount: number;
  readonly merchant: string;
  readonly category: string;
  readonly icon: string;
  readonly categoryLabel: string;
  readonly whenLabel: string;
  /** 🔴 예시 데이터임을 화면이 밝혀야 한다 */
  readonly isMock: boolean;
};

function whenLabel(at: Date, now = new Date()) {
  const days = Math.floor((now.getTime() - at.getTime()) / 864e5);
  return days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
}

function toView(r: {
  id: string; amount: number; merchant: string; category: string;
  occurredAt: Date; source: string;
}): CardTxnView {
  const cat = categoryOf(r.category);
  return {
    id: r.id, amount: r.amount, merchant: r.merchant, category: r.category,
    icon: cat.icon, categoryLabel: cat.label,
    whenLabel: whenLabel(r.occurredAt), isMock: r.source === "MOCK",
  };
}

/** 아직 어느 계획에도 안 붙은 거래 — 「이거였나요?」로 보여준다 */
export async function getUnmatched(childId: string, take = 6): Promise<CardTxnView[]> {
  const rows = await prisma.cardTransaction.findMany({
    where: { childId, recordId: null },
    orderBy: { occurredAt: "desc" },
    take,
    select: { id: true, amount: true, merchant: true, category: true, occurredAt: true, source: true },
  });
  return rows.map(toView);
}

export async function getTxn(childId: string, txnId: string) {
  return prisma.cardTransaction.findFirst({
    where: { id: txnId, childId, recordId: null },
    select: { id: true, amount: true, merchant: true, category: true },
  });
}

/**
 * 거래를 지출 기록에 붙인다.
 * 🔴 **한 거래는 한 번만 쓰인다** — DB 유니크가 막는다. 같은 거래로 두 계획을 맞춰
 *    별을 두 번 받을 수 없다.
 */
export async function attach(childId: string, txnId: string, recordId: string) {
  const r = await prisma.cardTransaction.updateMany({
    where: { id: txnId, childId, recordId: null },
    data: { recordId },
  });
  return r.count === 1;
}

/** 이 지출 기록에 붙은 거래 — 회고가 대조에 쓴다 */
export async function findByRecord(childId: string, recordId: string) {
  const r = await prisma.cardTransaction.findFirst({
    where: { childId, recordId },
    select: { id: true, amount: true, merchant: true, category: true, occurredAt: true, source: true },
  });
  return r ? toView(r) : null;
}
