/**
 * 별 계약 — CTR-002 의 일부.
 *
 * 🔴 화면은 **이 타입만 본다.** Prisma 모델을 화면으로 새게 두면
 *    DB 를 고칠 때마다 화면이 따라 깨진다.
 */
export type StarTriggerCode =
  | "ONBOARDING_LEARN" | "ATTENDANCE" | "QUIZ_CORRECT"
  | "MISSION_APPROVED" | "SPENDING_RETRO" | "WISHLIST_REACHED"
  | "SAVINGS_JOINED" | "SAVINGS_DONE"
  /** 옷장·방 아이템 구매 — 별이 나가는 유일한 곳 (P-21) */
  | "WARDROBE_SPEND";

/** 아이 화면에 보이는 한 줄 */
export type StarEntryView = {
  readonly id: string;
  readonly reason: string;
  readonly delta: number;
  readonly kind: string;
  readonly whenLabel: string;
};

export type StarWalletView = {
  readonly balance: number;
  readonly entries: readonly StarEntryView[];
};

/**
 * 지급 요청. `idempotencyKey` 는 **호출자가 만든다** —
 * 오프라인 큐가 같은 실천을 재전송해도 같은 키를 들고 오기 때문이다 (REQ-NF-003).
 */
export type GrantStarInput = {
  readonly childId: string;
  readonly triggerCode: StarTriggerCode;
  readonly delta: number;
  readonly idempotencyKey: string;
  readonly practiceId?: string;
};

export type GrantStarResult =
  | { readonly ok: true; readonly balance: number; readonly duplicated: boolean }
  | { readonly ok: false; readonly reason: "INSUFFICIENT" };
