// 🔴 문항과 채점은 `@/modules/quiz` 가 한다. 여기 남은 것은 문구뿐이다.

export const explainTitle = "왜 그럴까요";
export const correctLabel = "맞았어요!";
export const wrongLabel = "다시 볼까요";
/**
 * 🔴 오답에 벌칙·감소를 두지 않는다 (P-03). 틀려도 별은 그대로다.
 * 🔴 그리고 **여기서 끝내지 않는다** — 틀려도 배운 걸 해보면 별을 받을 수 있다 (D16).
 *    이 한 줄이 없으면 아이에게 오답은 그냥 실패로 남는다.
 */
export const wrongNotice = "괜찮아요. 별은 그대로예요.";
export const wrongPractice = "배운 걸 해보면 별을 받을 수 있어요.";
export const starNotice = "⭐ 1개를 받았어요";
/** 🔴 「틀렸다」가 아니다. 맞혔는데 오늘 별을 다 받은 것이다 (FR-011) */
export const limitNotice = "맞았어요! 오늘 별은 다 받아서 이번엔 안 붙어요. 내일 또 받을 수 있어요.";
/** 🔴 하루에 한 문제다. 「다음 문제」를 두면 하루에 몰아 푼다 */
export const todayLabel = "오늘의 문제";
export const tomorrow = "내일 또 새 문제가 나와요.";
export const doneToday = "오늘 문제는 다 풀었어요. 내일 또 만나요!";
export const backToPractice = "실천하러 가기";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };

/**
 * 🔴 **읽기 전엔 문제가 안 열린다** (D65). 「안 돼요」로 끝내지 않고
 *    **무엇을 하면 열리는지** 적는다 (`ACE-1.1`).
 */
export const needLesson = {
  title: "먼저 한 편 읽어요",
  body: "이야기를 읽으면 오늘의 문제가 열려요.",
  cta: "배우러 가기 →",
};
