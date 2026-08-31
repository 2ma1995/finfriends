import "server-only";
import { prisma } from "@/db";
import { countWaiting } from "@/modules/mission";
import { INTEREST_CHOICES, TOPUP_AMOUNTS, type BankView } from "@/contracts/bank";

/**
 * 아이 통장(보호자용) — SRS §3 · 어긋남 대장 D21.
 *
 * 🔴 **돈을 옮기지 않는다.** 잔액은 시연용 표시고 실제 충전은 제휴사 API 가 한다
 *    (`requestTopUp` · §6.1 진입점 9번 · 착수 조건 D1 미확정).
 *
 * 🔴 이자도 **지급하지 않는다.** 부모가 이자율을 정하는 것까지만이며
 *    지급 주기가 D6 미결이다. 계산해 보여주는 것과 주는 것은 다르다.
 */

export async function getBank(
  guardianId: string,
  childId: string | null,
  childName: string | null,
): Promise<BankView> {
  const [guardian, saved, waiting, open] = await Promise.all([
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { mockBalanceWon: true, savingsInterestPct: true, mockCardStatus: true },
    }),
    childId
      ? prisma.wishlist.aggregate({ where: { childId }, _sum: { savedAmount: true } })
      : Promise.resolve({ _sum: { savedAmount: 0 } }),
    childId ? countWaiting(childId) : Promise.resolve(0),
    childId
      ? prisma.mission.count({ where: { childId, state: "PENDING", doneAt: null } })
      : Promise.resolve(0),
  ]);

  const savedWon = saved._sum.savedAmount ?? 0;
  const pct = guardian?.savingsInterestPct ?? null;

  return {
    childName,
    balanceWon: guardian?.mockBalanceWon ?? 0,
    cardActive: guardian?.mockCardStatus === "ACTIVE",
    interestPct: pct,
    savedWon,
    // 🔴 한 번 줄 때 기준. 주기가 정해지지 않았으므로 자동으로 주지 않는다
    interestWon: pct === null ? 0 : Math.floor((savedWon * pct) / 100),
    waitingMissions: waiting,
    openMissions: open,
  };
}

/**
 * 🔴 **돈이 움직이지 않는다.** 시연용 잔액 숫자만 올린다 (D21).
 *    허용된 금액만 받는다 — 임의 금액을 받으면 실제 이체 흐름처럼 읽힌다.
 */
export async function topUpMock(guardianId: string, amount: number) {
  if (!TOPUP_AMOUNTS.includes(amount as (typeof TOPUP_AMOUNTS)[number])) return;
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { mockBalanceWon: { increment: amount } },
  });
}

/** 이자율 설정. 저장까지만 하고 지급은 하지 않는다 — 주기가 D6 미결이다 */
export async function setInterestPct(guardianId: string, pct: number) {
  if (!INTEREST_CHOICES.includes(pct as (typeof INTEREST_CHOICES)[number])) return;
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { savingsInterestPct: pct },
  });
}

/** 시연을 다시 처음부터 */
export async function resetBankMock(guardianId: string) {
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { mockBalanceWon: 0, savingsInterestPct: null },
  });
}
