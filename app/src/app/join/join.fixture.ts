// PROTO-DATA: CON-003 · CON-004 — 백엔드 완료 시 이 파일을 지우고 기기 등록 액션으로 대체한다

/**
 * 아이 기기에서 초대 링크를 열었을 때의 화면이다.
 *
 * 🔴 여기서 아동 자격증명을 만들지 않는다. 이 기기를 보호자 계정 하위의 아동 프로필에
 *    묶기만 한다 (SRS-Tech §6.6 · REQ-NF-011 · S5).
 * 🔴 동의 완료가 선행 조건이다. 서버가 판정하며 클라이언트가 캐시하지 않는다
 *    (P-05 · P-22 · 스킬 304 §2). 이 픽스처의 `consentCompleted` 는 서버 판정 결과의 자리다.
 */

export const child = {
  displayName: "정하율",
  birthYear: 2017,
};

/** 서버가 판정한다. false 면 등록으로 넘어가지 않는다 */
export const consentCompleted = true;

export const whatHappens = [
  "이 기기를 열면 바로 정하율의 화면이 나옵니다.",
  "정하율은 아이디도 비밀번호도 입력하지 않습니다.",
  "부모가 로그아웃해도 이 기기는 계속 열립니다 — 옆에 없어도 아이가 씁니다.",
  "승인·소비 같은 부모 화면은 이 기기에서 열리지 않습니다.",
];

/** 등록해도 받지 않는 것. 동의 화면의 「받지 않는 것」과 같은 규약이다 */
export const notCollected = ["기기 고유번호", "위치 정보", "얼굴 사진", "연락처"];

export const confirmLabel = "이 기기를 정하율의 화면으로 등록하기";

export const blockedLabel = "동의를 먼저 마쳐야 등록할 수 있어요";

/** 어긋남 대장 D5 — 부모 화면 복귀는 보호자 PIN. 경로 차단은 미들웨어가 서버에서 한다 */
export const parentExitNotice =
  "부모 화면으로 돌아갈 때는 보호자 PIN을 입력합니다.";

export const nextHref = "/child/home";
