// 하교 알림 문구 — 🔴 판단은 `modules/schedule` 이, 저장은 `actions/plan` 이 한다. 여기는 말뿐이다.

/** 🔴 `{time}` 은 부모가 정한 하교 시각이 들어간다. 숫자는 화면이 채운다 */
export const askTitle = "오늘 쓸 계획이 있니?";
export const askBody = "{time} 이 지났어요. 오늘 돈 쓸 일이 있으면 미리 적어두면 좋아요.";
export const yesLabel = "응, 있어요";
export const noLabel = "오늘은 없어요";
/** 🔴 안 적어도 괜찮다고 말해준다 — 모달이 벌처럼 느껴지면 아이는 앱을 피한다 */
export const noHint = "안 적어도 괜찮아요. 내일 다시 물어볼게요.";
export const plannedNotice = "적어뒀어요. 쓴 뒤에 맞춰볼게요.";
export const formTitle = "어디서 · 무엇을 · 얼마를";
export const closeLabel = "닫기";
