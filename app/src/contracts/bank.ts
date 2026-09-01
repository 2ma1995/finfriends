/**
 * 아이 통장(보호자용) 계약 — SRS §3 보호자 화면 · 어긋남 대장 D21.
 *
 * SRS 는 이 화면에 세 가지를 넣었다 — **충전 · 미션 관리 · 이자율 설정.**
 * 아동 화면의 「내 통장」(미션 · 계획 카드 · 대조 · 위시리스트)과는 **별개 화면**이다.
 *
 * 🔴 **잔액은 용돈 원장의 합이다** — 컬럼에 따로 저장하지 않는다 (인계 문서 규칙 ①).
 *    보호자가 넣은 그 줄을 아이 화면이 그대로 읽는다. 두 곳에 두면 숫자가 갈린다.
 *
 * 🔴 **「잔액」은 한 숫자가 아니다.** 목표에 떼어 둔 돈은 쓴 게 아니라 묶인 것이고,
 *    원장 합에는 잡히지 않는다. 실제 통장의 「출금가능금액」과 「잔액」이 다른 것과 같다.
 *    세는 것은 `modules/allowance.getWalletTotals` **하나뿐**이다 — 각자 세면 또 갈린다.
 *
 * 🔴 **앱이 돈을 보관하지 않는다** (D18). 원장은 「얼마 줬다」는 기록이고 실제 돈은
 *    현금이나 부모 카드로 앱 밖에서 오간다. 실제 충전은 `requestTopUp`(§6.1 진입점 9번)이
 *    제휴사 API 를 부르며, 착수 조건 D1(수수료율 · SLA)이 미확정이다.
 */

/**
 * 충전 금액 후보. 🔴 **금액을 직접 입력받지 않는다** —
 * 시연에 필요한 것은 「충전이 된다」이지 임의 금액이 아니고,
 * 입력란을 두면 실제 이체처럼 읽힌다.
 */
export const TOPUP_AMOUNTS = [5000, 10000, 30000] as const;

/**
 * 이자율 후보(%). 부모가 직접 주는 이자다 (§9 근거표 A3).
 * 🔴 외부 예적금(F15 · REQ-FUNC-014)과 다른 기능이며 그쪽은 P-20 법률 검토 대기다.
 */
export const INTEREST_CHOICES = [0, 1, 3, 5, 10] as const;

export type BankView = {
  readonly childName: string | null;
  /**
   * 🔴 **아이가 가진 돈 전체** = 쓸 수 있는 돈 + 목표에 넣어 둔 돈 + 적금에 넣은 돈.
   *    원장 합만 보여주면 목표에 떼어 둔 돈이 **사라진 것처럼** 보인다 —
   *    실제로 20,000원을 준 뒤 화면에 10,500원만 떴다.
   */
  readonly totalWon: number;
  /** 지금 바로 쓸 수 있는 돈 — 원장(`activity.allowance_ledger`)의 합이다 */
  readonly freeWon: number;
  /** 🔴 목표에 묶인 돈. **쓴 게 아니다.** 이자가 붙는 대상이기도 하다 */
  readonly setAsideWon: number;
  /**
   * 🔴 적금(「우리 집 적금」)으로 묶인 돈. 이것도 **쓴 게 아니다.**
   *    빠뜨리면 `total ≠ free + setAside` 가 되어 또 「돈이 어디 갔지」가 된다.
   */
  readonly lockedWon: number;
  /** 카드가 사용 중이어야 아이가 이 돈을 실제로 쓸 수 있다 */
  readonly cardActive: boolean;
  readonly interestPct: number | null;
  /**
   * 이자율을 적용하면 얼마인가. 🔴 **지급 주기가 D6 미결**이라
   * 「한 번 줄 때」 기준으로만 보여주고 자동 지급은 하지 않는다.
   */
  readonly interestWon: number;
  /** 승인을 기다리는 미션 수 — 통장이 미션 관리의 입구다 */
  readonly waitingMissions: number;
  readonly openMissions: number;
};
