// 하교 알림 문구 — 🔴 판단은 `modules/schedule` 이, 저장은 `actions/plan` 이 한다. 여기는 말뿐이다.

/** 🔴 `{time}` 은 부모가 정한 하교 시각이 들어간다. 숫자는 화면이 채운다 */
export const askTitle = "오늘 쓸 계획이 있니?";
export const askBody = "{time} 이 지났어요. 오늘 돈 쓸 일이 있으면 미리 적어두면 좋아요.";
export const yesLabel = "응, 있어요";
export const noLabel = "오늘은 없어요";
/** 🔴 안 적어도 괜찮다고 말해준다 — 모달이 벌처럼 느껴지면 아이는 앱을 피한다 */
export const noHint = "안 적어도 괜찮아요. 내일 다시 물어볼게요.";
export const plannedNotice = "적어뒀어요. 쓴 뒤에 맞춰볼게요.";

/**
 * 하교 모달에서 적다가 막힌 경우 — 🔴 **여기가 비어 있었다.**
 *
 * `savePlanCard` 는 `from=home` 이면 `/child/home?error=…` 로 돌려보내는데,
 * 내 방이 그 값을 **그리지 않았다** — 아이는 모달이 닫히고 아무 말도 없으니
 * **적은 계획이 그냥 사라진 것으로 본다.**
 *
 * 🔴 예전엔 모달 입력칸의 `required` 가 브라우저 수준에서 막아 줘서 여기까지 오지
 *    않았다. 그 `required` 를 떼면(D66) 이 구멍이 그대로 드러난다 — 그래서 같이 채운다.
 */
export const askErrors: Record<string, string> = {
  too_big: "금액이 너무 커요. 백만 원까지 적을 수 있어요.",
  "1": "어디서 · 무엇을 · 얼마를 다 적어야 해요.",
};
export const formTitle = "어디서 · 무엇을 · 얼마를";
export const closeLabel = "닫기";
