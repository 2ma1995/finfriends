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
 * 🔴 **카드가 아니다.** 시연용 상태 표시다 (어긋남 대장 D20).
 *    실제 발급은 제휴사(PTN-001)가 하고 D1·D-03 이 미확정이다.
 */
export type MockCardStatus = "REQUESTED" | "VERIFIED" | "SHIPPING" | "ACTIVE";

/** 신청 과정 4단계. 실제 흐름(다이어그램 A)의 모양만 따른다 */
export const CARD_STEPS: readonly {
  readonly status: MockCardStatus;
  readonly title: string;
  readonly body: string;
  readonly action: string;
}[] = [
  {
    status: "REQUESTED",
    title: "신청 접수",
    body: "아이 이름과 태어난 해로 신청합니다. 카드번호·계좌·실명은 받지 않습니다.",
    action: "신청 접수하기",
  },
  {
    status: "VERIFIED",
    title: "본인 확인",
    body: "제휴 선불업자가 보호자 본인 확인을 진행합니다. 우리 화면에서 신분 정보를 받지 않습니다.",
    action: "본인 확인 넘기기",
  },
  {
    status: "SHIPPING",
    title: "카드 배송",
    body: "카드가 오는 동안에도 아이는 배우기·퀴즈로 별을 받을 수 있어요. 카드가 필요한 기능만 잠깁니다.",
    action: "배송 시작하기",
  },
  {
    status: "ACTIVE",
    title: "카드 등록",
    body: "카드를 받으면 등록해 사용을 시작합니다. 이때부터 소비 내역이 쌓입니다.",
    action: "카드 등록하기",
  },
];

export type MockCardState = {
  readonly status: MockCardStatus | null;
  readonly stepIndex: number;
  readonly active: boolean;
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
