/** 위시리스트 계약 — CTR-002 의 일부. 화면은 이 타입만 본다 */

/** 🔴 30·70·100% 에서 단계 보상이 붙는다 (PRC-004). 같은 단계에 두 번 주지 않는다 */
export const MILESTONES = [30, 70, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

export type WishView = {
  readonly id: string;
  readonly name: string;
  readonly targetAmount: number;
  readonly savedAmount: number;
  readonly percent: number;
  readonly rank: number;
  /** 이미 지나 별을 받은 단계 */
  readonly reached: readonly Milestone[];
  /** 다음 단계까지 남은 퍼센트. 다 지났으면 null */
  readonly nextMilestone: Milestone | null;
  /**
   * 🔴 목표까지 남은 **금액**. 퍼센트보다 아이에게 구체적이다 —
   *    300,000원 목표에 1,000원을 넣으면 퍼센트는 **0% 그대로**라
   *    「넣었는데 아무 일도 안 일어났다」가 된다.
   */
  readonly remaining: number;
};

export type WishlistView = {
  readonly wishes: readonly WishView[];
  /** 순위 변경은 월 1회 (PRC-004) */
  readonly rankChangesLeft: number;
};
