// PROTO-DATA: LRN-001 — 🔴 문항과 채점은 `@/modules/quiz` 가 한다. 여기 남은 것은 문구뿐이다.
// 문항이 DB(`DAT-003`)로 옮겨가면 모듈만 고치면 된다.

export const explainTitle = "왜 그럴까요";
export const correctLabel = "맞았어요!";
export const wrongLabel = "다시 볼까요";
/** 🔴 오답에 벌칙·감소를 두지 않는다 (P-03). 틀려도 별은 그대로다 */
export const wrongNotice = "괜찮아요. 별은 그대로예요.";
export const starNotice = "⭐ 1개를 받았어요";
export const nextLabel = "다음 문제";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
