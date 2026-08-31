// PROTO-DATA: CON-002 — 백엔드 완료 시 이 파일을 지우고 서버 판정(동의 게이트)으로 대체한다

/**
 * 🔴 허용 오차 0 항목이다 (스킬 304). 동의 없이 통과하는 경로를 만들지 않는다.
 * 위치정보(좌표)·얼굴 필드는 수집 항목에 존재하지 않는다 — SRS §1.4 ③-3.
 */
export type Item = { readonly key: string; readonly label: string; readonly required: boolean; readonly checked: boolean };

export const items: readonly Item[] = [
  { key: "guardian", label: "만 14세 미만 아동의 법정대리인임을 확인합니다", required: true,  checked: true },
  { key: "terms",    label: "서비스 이용약관",                              required: true,  checked: true },
  { key: "privacy",  label: "개인정보 수집·이용 — 아이 이름 · 생년월 · 실천 기록", required: true,  checked: false },
  { key: "marketing",label: "소식 받기 (선택)",                             required: false, checked: false },
];

export const notCollected = ["위치 정보", "얼굴 사진", "연락처", "학교"];

export const gateNotice = "동의 없이는 다음 화면으로 넘어가지 않습니다.";
