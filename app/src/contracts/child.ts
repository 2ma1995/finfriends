/**
 * 아이 프로필 계약 — CON-003 · 온보딩 3단계.
 *
 * 🔴 **수집 최소화가 설계다.** 받는 것은 화면에 보일 이름과 태어난 해뿐이다.
 *    생년월일 전체·연락처·학교·사진은 받지 않는다 (§3.5 · P-13 · P-19).
 *    필드를 늘리는 것은 요구사항 변경이다.
 */

export type DeviceTypeValue = "OWN_PHONE" | "KIDS_WATCH" | "SHARED" | "NONE";

/**
 * 기기 유형 — 🔴 **모집 분류 전용이다.** 기기 식별자가 아니다
 * (schema: `child_accounts.device_type`). 알림 도달 가능성을 가늠하는 데만 쓴다.
 */
export const DEVICE_TYPES: readonly { value: DeviceTypeValue; label: string; hint: string }[] = [
  { value: "OWN_PHONE", label: "아이 전용 폰·태블릿", hint: "아이가 혼자 쓰는 기기" },
  { value: "KIDS_WATCH", label: "키즈워치", hint: "알림이 제한될 수 있어요" },
  { value: "SHARED", label: "같이 쓰는 기기", hint: "부모 기기를 함께 씁니다" },
  { value: "NONE", label: "아직 없어요", hint: "나중에 정해도 됩니다" },
];

/**
 * 🔴 만 14세 미만만 가입한다 (F-01 · ADR-003).
 *    이 나이를 넘으면 마이데이터 미가입 전제와 자체 카드 발급 폐쇄형 구조가 무너진다 —
 *    제품의 법적 골격 자체가 달라지므로 화면에서 막는다.
 */
export const AGE_LIMIT = 14;

/** 태어난 해만 받으므로 나이는 해 차이로 센다. 경계에서 한 살 어리게 잡히는 쪽이 안전하다 */
export function ageFromBirthYear(birthYear: number, now = new Date()) {
  return now.getFullYear() - birthYear;
}

export const NAME_MAX = 12;

export type ChildProfileInput = {
  readonly displayName: string;
  readonly birthYear: number;
  /** 🔴 필수다. 「아직 없어요」(NONE)가 선택지에 있으므로 빈 값을 둘 이유가 없다 */
  readonly deviceType: DeviceTypeValue | null;
};

export type ChildProfileError =
  | "NAME_REQUIRED"
  | "NAME_TOO_LONG"
  | "BIRTH_YEAR_INVALID"
  | "TOO_OLD"
  | "DEVICE_TYPE_INVALID"
  | "ALREADY_EXISTS"
  /** 🔴 동의 전에는 아동 정보를 받지 않는다 (P-05 · P-22) */
  | "CONSENT_REQUIRED";

export const CHILD_PROFILE_MESSAGES: Record<ChildProfileError, string> = {
  NAME_REQUIRED: "아이가 화면에서 볼 이름을 적어 주세요.",
  NAME_TOO_LONG: `이름은 ${NAME_MAX}자까지 쓸 수 있어요.`,
  BIRTH_YEAR_INVALID: "태어난 해를 다시 확인해 주세요.",
  TOO_OLD: `핀프렌즈는 만 ${AGE_LIMIT}세 미만 아동을 위한 서비스예요.`,
  DEVICE_TYPE_INVALID: "기기를 하나 골라 주세요.",
  ALREADY_EXISTS: "이미 등록한 아이가 있어요.",
  CONSENT_REQUIRED: "동의를 먼저 마쳐야 아이 정보를 받을 수 있어요.",
};

export type ChildProfileView = {
  readonly id: string;
  readonly displayName: string;
  readonly birthYear: number;
  readonly deviceLabel: string;
};

export type SaveChildProfileResult =
  | { readonly ok: true; readonly childId: string }
  | { readonly ok: false; readonly reason: ChildProfileError };

/** 온보딩 6단계의 실제 진행 상태. 화면이 하드코딩하지 않고 이것을 읽는다 */
export type OnboardingProgress = {
  readonly accountDone: boolean;
  readonly consentDone: boolean;
  readonly childDone: boolean;
  readonly deviceDone: boolean;
  /** 🔴 시연용 가짜 카드 상태다 (어긋남 대장 D20). 실제 발급은 PTN-001 */
  readonly cardDone: boolean;
};
