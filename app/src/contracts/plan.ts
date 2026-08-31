/** 계획 카드 · 계획↔실제 대조 계약 — CTR-002 의 일부 */

/** 업종 — 사전은 `DAT-004` 가 채운다. 그때까지 4종으로 고정한다 */
export const CATEGORIES = [
  { code: "STATIONERY", icon: "🖊", label: "문구" },
  { code: "SNACK", icon: "🍬", label: "간식·음료" },
  { code: "BOOK", icon: "📚", label: "도서" },
  { code: "GIFT", icon: "🎁", label: "선물" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];

export function categoryOf(code: string) {
  return CATEGORIES.find((c) => c.code === code) ?? { code, icon: "🛍", label: code };
}

export type PlanAuthorLabel = "아이" | "보호자";

export type NewPlanCard = {
  readonly where: string;
  readonly category: CategoryCode;
  readonly limitAmount: number;
  readonly items?: string;
  readonly author: PlanAuthorLabel;
};

export type SpendLineView = {
  readonly icon: string;
  readonly label: string;
  readonly amount: number;
  /** 계획에 없던 업종 — 강조 표시 대상. 🔴 ⭐를 차단하지는 않는다 (ADR-008) */
  readonly unplanned: boolean;
};

export type RetroView = {
  readonly id: string;
  readonly whenLabel: string;
  readonly planned: readonly SpendLineView[];
  readonly actual: readonly SpendLineView[];
  /** 🔴 금액 단독 판정 (ADR-008) */
  readonly match: "MET" | "EXCEEDED" | "NO_PLAN";
  /** 🔴 넘김에도 문장은 똑같이 제시한다. 갈리는 건 별뿐이다 */
  readonly retroLines: readonly string[];
  /** 🔴 넘김은 미지급이되 **차감하지 않는다** (P-03) */
  readonly starLabel: string;
  /** 다른 갈래를 보여줄 때 쓸 id — 인터뷰용 */
  readonly otherBranchId: string | null;
  /**
   * 🔴 카드 내역과의 대조 — 적은 금액과 실제가 다를 때 보여준다 (D19).
   *    자동으로 고쳐 주지 않는다. 차이를 마주하는 것이 학습이다.
   */
  readonly card: { merchant: string; amount: number; gap: number; isMock: boolean } | null;
};

/** 적어둔 계획 한 줄 — 목록이 보는 것 */
export type PlanCardView = {
  readonly id: string;
  readonly where: string;
  readonly icon: string;
  readonly categoryLabel: string;
  readonly limitAmount: number;
  readonly items: string | null;
  readonly whenLabel: string;
  readonly byGuardian: boolean;
  /**
   * 🔴 **아직 맞춰보지 않은 계획.** 이게 목록의 존재 이유다 —
   *    적어만 두고 맞춰보지 않으면 계획 카드는 그냥 메모다.
   */
  readonly recordId: string | null;
  readonly match: "MET" | "EXCEEDED" | null;
};
