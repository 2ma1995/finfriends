/**
 * 아이 통장(보호자용) 계약 — SRS §3 보호자 화면 · 어긋남 대장 D21.
 *
 * SRS 는 이 화면에 세 가지를 넣었다 — **충전 · 미션 관리 · 이자율 설정.**
 * 아동 화면의 「내 통장」(미션 · 계획 카드 · 대조 · 위시리스트)과는 **별개 화면**이다.
 *
 * 🔴 잔액과 충전은 **시연용**이다. 선불충전금은 제휴사가 100% 별도관리하며(ADR-004)
 *    실제 충전은 `requestTopUp`(§6.1 진입점 9번)이 제휴사 API 를 부른다.
 *    착수 조건 D1(수수료율 · SLA)이 미확정이다.
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
  /** 🔴 시연용 표시. 실제 잔액은 제휴사가 갖는다 */
  readonly balanceWon: number;
  /** 카드가 사용 중이어야 실제로는 충전할 수 있다 */
  readonly cardActive: boolean;
  readonly interestPct: number | null;
  /** 아이가 모으기 목표에 넣어 둔 금액 합계 — 이자의 대상이다 */
  readonly savedWon: number;
  /**
   * 이자율을 적용하면 얼마인가. 🔴 **지급 주기가 D6 미결**이라
   * 「한 번 줄 때」 기준으로만 보여주고 자동 지급은 하지 않는다.
   */
  readonly interestWon: number;
  /** 승인을 기다리는 미션 수 — 통장이 미션 관리의 입구다 */
  readonly waitingMissions: number;
  readonly openMissions: number;
};
