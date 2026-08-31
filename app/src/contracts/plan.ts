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
};
