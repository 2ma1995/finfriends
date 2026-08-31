// PROTO-DATA: CON-003 — 백엔드 완료 시 이 파일을 지우고 초대 토큰 발급 액션으로 대체한다

/**
 * 🔴 이 링크는 **자격증명이 아니다.** 아동 계정에 아이디·비밀번호를 만들지 않는다.
 *    링크가 하는 일은 그 기기를 보호자 계정 하위의 아동 프로필에 **묶는 것**뿐이다
 *    (SRS-Tech §6.6 · REQ-NF-011 · S5 · 스킬 304 §4).
 *
 * 동의가 완료되기 전에는 초대 링크를 만들 수 없다 — 아동 화면 첫 진입부터
 * 개인정보 처리가 시작되므로 순서 자체가 규제 요건이다 (P-05 · P-22).
 */

/** 초대 대상. 이름과 태어난 해만 갖는다 — 생년월일 전체를 받지 않는다 */
export const child = {
  displayName: "정하율",
  birthYear: 2017,
  /** 모집 분류 전용이다. 기기 식별자가 아니다 (schema: child_accounts.device_type) */
  deviceLabel: "아이 전용 태블릿",
};

/** 🔴 링크 문자열과 만료 시간은 「예시값」이다. 만료 시간은 아직 정하지 않았다 */
export const invite = {
  url: "finfriends.app/join/8KQ2-7HTX",
  expiresIn: "30분",
  copyLabel: "링크 복사",
};

/** 아이 기기에서 부모가 직접 열어야 한다 — 아이에게 링크를 보내는 것이 아니다 */
export const howTo = [
  "아이가 쓸 기기에서 이 링크를 엽니다.",
  "부모가 직접 열어 주세요. 여는 순간 그 기기가 아이 화면으로 등록됩니다.",
  "등록이 끝나면 그 기기는 열자마자 아이 화면이 나옵니다.",
];

/** 스킬 304 §4 — 「아동 독립 로그인 시도 0건」은 인증 구조에서 결정된다 */
export const noCredentialNotice = {
  title: "아이는 아이디도 비밀번호도 만들지 않아요",
  body: "링크는 기기를 등록하는 용도입니다. 아이가 로그인하는 일은 없고, 아이 화면은 부모 계정 안의 프로필로 열립니다.",
};

/**
 * 기기 등록 규칙. 어긋남 대장 D5·D5-b 의 결정을 화면 문구로 옮긴 것이다.
 * 값의 원천은 `src/lib/session/device-session.ts` (TTL_DAYS=180 · verifyChildAccess).
 */
export const rules: readonly { k: string; v: string }[] = [
  { k: "등록 유지", v: "180일 · 해제할 때까지" },
  { k: "부모 로그아웃", v: "아이 기기는 그대로" },
  { k: "열리는 곳", v: "아이 화면만" },
  { k: "부모 화면", v: "보호자 PIN" },
  { k: "동의", v: "들어올 때마다 확인" },
];

export const previewLink = { href: "/join", label: "아이 기기에서 열면 이렇게 보여요" };
