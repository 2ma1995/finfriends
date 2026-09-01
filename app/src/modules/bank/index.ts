import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db";
import { countWaiting } from "@/modules/mission";
import { getWalletTotals, topUp } from "@/modules/allowance";
import { INTEREST_CHOICES, TOPUP_AMOUNTS, type BankView } from "@/contracts/bank";

/**
 * 아이 통장(보호자용) — SRS §3 · 어긋남 대장 D21.
 *
 * 🔴 **잔액을 컬럼에 저장하지 않는다.** 용돈 원장(`activity.allowance_ledger`)의
 *    **합이 잔액이다** (인계 문서 규칙 ①). 한동안 `guardian_accounts.mock_balance_won`
 *    에 따로 더했는데, 아이 화면은 원장을 보고 이 화면은 컬럼을 봐서
 *    **같은 통장에 두 숫자가 떴다** — 실제로 60,000원과 20,000원이었다.
 *
 * 🔴 **원장 표를 직접 보지 않는다.** allowance 모듈의 공개 함수를 부른다 (스킬 301 §5).
 *    그래야 「0 밑으로 내려가지 않는다 · 중복은 한 줄」 규율이 한 곳에만 있는다.
 *
 * 🔴 **돈을 옮기지 않는다.** 원장은 「얼마 줬다」는 기록이고 실제 돈은 앱 밖에 있다 (D18).
 *    실제 충전은 제휴사 API 가 한다 (`requestTopUp` · §6.1 진입점 9번 · D1 미확정).
 *
 * 🔴 이자는 **지급하지 않는다.** 부모가 이자율을 정하는 것까지이며 주기가 D6 미결이다.
 *    계산해 보여주는 것과 주는 것은 다르다.
 */

export async function getBank(
  guardianId: string,
  childId: string | null,
  childName: string | null,
): Promise<BankView> {
  const [guardian, wallet, waiting, open] = await Promise.all([
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { savingsInterestPct: true, mockCardStatus: true },
    }),
    /**
     * 🔴 **여기서 따로 세지 않는다.** 한동안 원장 합은 allowance 에서 읽고
     *    목표에 떼어 둔 돈은 이 파일에서 따로 집계했다 — 그래서 부모 화면과
     *    아이 화면의 「가진 돈」이 또 갈렸다. 세는 곳은 `getWalletTotals` 하나다.
     */
    childId
      ? getWalletTotals(childId)
      : Promise.resolve({ free: 0, setAside: 0, locked: 0, total: 0 }),
    childId ? countWaiting(childId) : Promise.resolve(0),
    childId
      ? prisma.mission.count({ where: { childId, state: "PENDING", doneAt: null } })
      : Promise.resolve(0),
  ]);

  const savedWon = wallet.setAside;
  const pct = guardian?.savingsInterestPct ?? null;

  return {
    childName,
    totalWon: wallet.total,
    freeWon: wallet.free,
    setAsideWon: wallet.setAside,
    lockedWon: wallet.locked,
    cardActive: guardian?.mockCardStatus === "ACTIVE",
    interestPct: pct,
    // 🔴 한 번 줄 때 기준. 주기가 정해지지 않았으므로 자동으로 주지 않는다
    interestWon: pct === null ? 0 : Math.floor((savedWon * pct) / 100),
    waitingMissions: waiting,
    openMissions: open,
  };
}

/**
 * 용돈을 적는다 — 원장에 한 줄 더한다.
 *
 * 🔴 **정해진 세 금액만 받는다.** 입력란을 두면 실제 이체 흐름처럼 읽힌다.
 *    화면이 버튼만 보여도 다시 검사한다 — Server Action 은 공개 엔드포인트다 (§6.6 ②).
 *
 * 🔴 **누를 때마다 새 줄이다.** 같은 금액을 여러 번 줄 수 있으므로 멱등키를 새로 만든다.
 *    오프라인 큐가 같은 키로 두 번 보내는 경우는 원장이 한 줄로 접는다 (규칙 ④).
 */
export async function topUpAllowance(childId: string, amount: number) {
  if (!TOPUP_AMOUNTS.includes(amount as (typeof TOPUP_AMOUNTS)[number])) {
    return { ok: false, reason: "BAD_AMOUNT" } as const;
  }
  // memo 를 비우면 원장이 「용돈을 받았어요」로 적는다 — 아이가 그대로 읽는 문장이다
  return topUp(childId, amount, "", `topup:${randomUUID()}`);
}

/**
 * 이자율 설정. 저장까지만 하고 지급은 하지 않는다 — 주기가 D6 미결이다.
 * 🔴 이것은 **돈이 아니라 설정**이므로 원장이 아니라 보호자 계정에 둔다.
 */
export async function setInterestPct(guardianId: string, pct: number) {
  if (!INTEREST_CHOICES.includes(pct as (typeof INTEREST_CHOICES)[number])) return;
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { savingsInterestPct: pct },
  });
}
