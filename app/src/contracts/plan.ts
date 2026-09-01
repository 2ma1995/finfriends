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

// ─────────────────────────────────────────────────────────────
// 소비 내역 — PLN-005 · REQ-FUNC-013 (F13)
//
// 🔴 **전월 대비 증감액이 상단이다.** 이 화면의 목적은 「얼마 썼나」가 아니라
//    「지난달과 무엇이 달라졌나」다. 합계만 크게 보여주면 가계부가 된다.
// ─────────────────────────────────────────────────────────────

export type SpendSummaryView = {
  readonly monthLabel: string;
  readonly total: number;
  readonly prevTotal: number;
  /** 이번 달 − 지난달. 음수면 줄었다 */
  readonly delta: number;
  /** 🔴 지난달 기록이 없으면 증감을 0으로 그리지 않는다 (ACE-1.2 와 같은 규율) */
  readonly hasPrevMonth: boolean;
  readonly byCategory: readonly SpendLineView[];
  /** 계획 카드 없이 발생한 소비 건수 — C5 사각지대의 크기다 */
  readonly noPlanCount: number;
  readonly recordCount: number;
  /**
   * 🔴 **건별 내역.** 집계만 있으면 「소비 내역」이라는 이름이 거짓이 된다 —
   *    부모는 합계 4,500원을 보고도 무엇을 샀는지 알 수 없었다.
   *    `REQ-FUNC-013` 은 집계까지만 요구하지만 추적표의 컴포넌트 이름이
   *    `SpendingLedgerView` 이고 화면 이름도 「내역」이다 (어긋남 대장 D26).
   */
  readonly records: readonly SpendRecordView[];
  /**
   * 🔴 **지난달 건별 내역.** 달이 바뀌면 어제 쓴 것이 이번 달 목록에서 빠진다.
   *    그때 화면이 「소비 내역이 없어요 · 카드를 연결하면 모입니다」라고 말하면
   *    보호자는 **기록이 안 된 줄 안다** — 매달 1일마다 고장 난 것처럼 보였다.
   */
  readonly prevRecords: readonly SpendRecordView[];
};

/**
 * 소비 한 건.
 *
 * 🔴 **가게 이름이 없다.** 스키마에 `merchant_category` 만 있고 상호는 두지 않았다 —
 *    아이가 어디를 다니는지가 그대로 위치 기록이 된다. 업종까지가 이 화면의 한계다.
 */
export type SpendRecordView = {
  readonly id: string;
  /** 「9월 1일」 */
  readonly dayLabel: string;
  readonly icon: string;
  readonly categoryLabel: string;
  readonly amount: number;
  /**
   * 🔴 **잘못 표시가 아니다.** ⭐ 판정은 금액 단독이고(ADR-008) 업종 불일치는
   *    회고 문장을 가를 뿐 별을 막지 않는다. 화면도 그렇게 읽히게 적는다.
   *
   * 🔴 봉투 기록과 계획 카드 기록은 **다른 말을 한다** — 같은 문구를 쓰면 거짓이 된다.
   *    「간식 봉투에서 썼어요」와 「계획에 있었어요」는 다른 사실이다 (어긋남 대장 D35).
   */
  readonly planNote: string;
  /**
   * 🔴 **넘긴 금액을 음수로 쓰지 않는다.** 「−700원」은 아이도 부모도 **빚**으로 읽는다.
   *    0이면 봉투 안이거나 봉투 이전 기록이다.
   */
  readonly overBy: number;
  /** 봉투 이전(계획 카드) 기록인가 — 화면이 섞이지 않게 표시한다 */
  readonly legacy: boolean;
};
