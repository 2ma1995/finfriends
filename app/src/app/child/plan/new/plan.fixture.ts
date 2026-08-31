// PROTO-DATA: PLN-001 — 🔴 업종 목록은 `@/contracts/plan` 이, 저장은 `actions/plan` 이 한다.
// 여기 남은 것은 문구뿐이다.

/** 「예산」·「한도」라고 부르지 않는다. 계획 카드다 (용어 고정) */
export const notice = "가기 전에 적으면, 쓴 뒤에 맞춰볼 수 있어요.";
export const savedNotice = "적어뒀어요. 쓴 뒤에 맞춰볼게요.";
export const errorNotice = "어디서 · 무엇을 · 얼마를 다 적어야 해요.";
/** 🔴 「안 돼요」로 끝내지 않는다. 아이가 다음에 뭘 할지 알아야 한다 (ACE-1.1) */
export const tooBigNotice = "금액이 너무 커요. 백만 원까지 적을 수 있어요.";
export const submitLabel = "적어두기";

export const labels = { where: "어디서", what: "무엇을", amount: "얼마를" };
export const placeholders = { where: "예: 다이소 성수점", amount: "5000" };

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
