import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/db";
import { countWaiting } from "@/modules/mission";
import { getWalletTotals, topUp } from "@/modules/allowance";
import { type BankView } from "@/contracts/bank";

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
 * 🔴 이자율은 **「우리 집 적금」의 이자**다. 아이가 신청하면 이 값이 그 약속에 박히고
 *    만기에 보호자가 눌러 지급한다 (`modules/savings`).
 *
 * 🔴 한동안 이것을 「모으기 목표에 주는 이자」로 계산해 보여줬다 — 근거가 `§10.1` 의
 *    **[검증 대기] 가정** `A3` 였고 요구사항이 아니었다. 위시리스트의 실제 보상은
 *    `REQ-FUNC-012` 의 30 · 70 · 100% 각 ⭐1 이다 (어긋남 대장 D28).
 */

export async function getBank(
  guardianId: string,
  childId: string | null,
  childName: string | null,
): Promise<BankView> {
  const [guardian, wallet, waiting, open] = await Promise.all([
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { mockCardStatus: true },
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


  return {
    childName,
    totalWon: wallet.total,
    freeWon: wallet.free,
    setAsideWon: wallet.setAside,
    lockedWon: wallet.locked,
    cardActive: guardian?.mockCardStatus === "ACTIVE",
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
  /**
   * 🔴 **임의 금액을 받는다** (2026-09-01 사용자 요청 · 어긋남 대장 D53).
   *
   *    전에는 `TOPUP_AMOUNTS` 세 값만 받았다. 「입력란을 두면 실제 이체처럼 읽힌다」가
   *    이유였는데, 그때는 **잔액이 시연용 컬럼 숫자**였다.
   *    지금은 용돈 원장에 「얼마 줬다」를 적는 것이고(`D22`) 실제 돈은 앱 밖에서 오간다 —
   *    **적는 금액을 세 값으로 묶을 이유가 없다.**
   *
   * 🔴 **상한은 그대로다.** `topUp` 이 `1 ~ MAX_TOPUP`(50만원)을 검사한다.
   *    상한이 없으면 0 하나 더 눌린 실수가 그대로 아이 화면에 들어간다.
   *    되돌릴 수는 있지만(`/parent/bank/adjust`) 아이가 이미 봤을 수 있다.
   *
   * 🔴 **정수만 받는다.** 원 단위 아래는 뜻이 없고, 소수가 들어오면
   *    원장 합과 화면 표시가 어긋난다.
   */
  if (!Number.isInteger(amount)) return { ok: false, reason: "BAD_AMOUNT" } as const;
  // memo 를 비우면 원장이 「용돈을 받았어요」로 적는다 — 아이가 그대로 읽는 문장이다
  return topUp(childId, amount, "", `topup:${randomUUID()}`);
}
