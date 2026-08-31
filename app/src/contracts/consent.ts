/**
 * 동의 계약 — CON-002 · REQ-FUNC-007 · REQ-NF-008.
 *
 * 🔴 **항목 목록이 계약이다.** 화면이 자기 목록을 들고 있으면 서버가 검사하는 항목과
 *    화면이 보여주는 항목이 갈라진다. 그 순간 「필수 동의 없이 통과」가 가능해진다
 *    (허용 오차 0 항목 1번 · 스킬 304 §1).
 *
 * 🔴 문구는 **법정 고지**다 (P-12). 고치면 검수 대상이다.
 */

export type ConsentItemKey = "guardian" | "terms" | "privacy" | "marketing";

export type ConsentItem = {
  readonly key: ConsentItemKey;
  readonly label: string;
  /** 필수 항목이 하나라도 빠지면 동의가 성립하지 않는다 */
  readonly required: boolean;
};

export const CONSENT_ITEMS: readonly ConsentItem[] = [
  { key: "guardian", label: "만 14세 미만 아동의 법정대리인임을 확인합니다", required: true },
  { key: "terms", label: "서비스 이용약관", required: true },
  { key: "privacy", label: "개인정보 수집·이용 — 아이 이름 · 태어난 해 · 실천 기록", required: true },
  { key: "marketing", label: "소식 받기 (선택)", required: false },
];

export const REQUIRED_KEYS: readonly ConsentItemKey[] = CONSENT_ITEMS.filter((i) => i.required).map((i) => i.key);

/**
 * 수집하지 않는 항목. 「무엇을 받는가」보다 **「무엇을 받지 않는가」**가
 * 보호자의 불안을 줄인다. 좌표(P-19)·얼굴(P-13)은 스키마에 필드 자체가 없다.
 */
export const NOT_COLLECTED = ["위치 정보", "얼굴 사진", "연락처", "학교"] as const;

export const GATE_NOTICE = "동의 없이는 아이 화면이 열리지 않습니다.";

export type ConsentState = {
  readonly completed: boolean;
  readonly completedAt: Date | null;
};

export type CompleteConsentResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "MISSING_REQUIRED"; readonly missing: readonly ConsentItemKey[] };
