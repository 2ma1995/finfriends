/**
 * 마이페이지 계약 — 보호자 계정·기기·카드.
 *
 * 🔴 여기 담기는 것은 **보호자가 자기 것을 관리하는 데 필요한 최소**다.
 *    아이 정보는 이름과 태어난 해뿐이고(수집 최소화 · §3.5),
 *    카드번호·계좌·실명은 어디에도 없다.
 */

export type DeviceRow = {
  /** 🔴 기기 고유 식별자가 아니다. 우리가 만든 무작위 값이다 */
  readonly deviceRef: string;
  readonly childName: string;
  readonly registeredLabel: string;
  readonly lastSeenLabel: string;
  /** 보호자 경로를 두드린 횟수 — S5 감사가 세는 값. 0이 정상이다 */
  readonly blockedAttempts: number;
};

/**
 * 🔴 **카드가 아니다.** 시연용 상태 표시다 (어긋남 대장 D15).
 *    실제 발급은 제휴사(PTN-001)가 하고 D1·D-03 이 미확정이다.
 */
export type MockCardState = {
  readonly issued: boolean;
  readonly issuedLabel: string | null;
  /** 화면에 보일 가짜 번호. 🔴 저장하지 않고 매번 만든다 */
  readonly maskedNumber: string;
};

export type MyPageView = {
  readonly email: string;
  readonly consentCompleted: boolean;
  readonly consentLabel: string | null;
  readonly child: {
    readonly displayName: string;
    readonly birthYear: number;
    readonly deviceLabel: string;
  } | null;
  readonly devices: readonly DeviceRow[];
  readonly pinSet: boolean;
  readonly card: MockCardState;
};
