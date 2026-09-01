// 🔴 데이터는 DB(`@/modules/practice`)가 준다. 여기 남은 것은 문구뿐이다.

export const title = "실천하기";
export const sub = "오늘 할 일 네 가지";

/** 🔴 「배우고 → 해본다」가 이 제품의 규칙이다. 안 배웠으면 실천할 것이 없다 */
export const needsLesson = "먼저 한 편 읽어요";
export const readFirst = "배우러 가기 →";

export const claim = "해봤어요";
export const waiting = "부모님 확인 중";
export const done = "✓ 별 받았어요";
export const rejected = "다시 해볼까요?";

export const quizToday = "오늘의 문제";
export const quizDone = "오늘 문제 다 풀었어요";

/** 🔴 불리기는 미션이 아니라 저금으로 실천한다 (D25) */
export const savingsCta = "저금하러 가기 →";
export const savingsNone = "저금을 시작하면 실천이 돼요";

/** 🔴 눌렀으면 무슨 일이 일어났는지 말한다. 조용히 바뀌면 「눌렸나?」가 된다 */
export const claimed = "올렸어요! 부모님이 확인하면 별이 붙어요.";

/** 🔴 부모가 만든 미션은 금액이 걸려 있다 — 실천하기와 다른 흐름이라 따로 보낸다 */
export const parentMissions = "부모님이 준 미션 →";

export const hint = "네 가지를 다 할 필요는 없어요. 오늘 하나면 충분해요.";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };

/**
 * 둠칫둠칫 유도 — 🔴 **아직 안 한 것에만 붙인다.**
 *
 * 네 칸 중 **벌기와 쓰기 둘뿐**이다. 넷 다 흔들면 아무것도 안 흔드는 것과 같고,
 * 아이는 「또 뭐 하라는 거야」가 된다. 이 둘은 **다른 사람과 얽힌 일**이라
 * 미루면 그날이 지나간다 — 부모가 걸어 둔 미션, 나가기 전에 세우는 계획.
 *
 * 🔴 `{n}` 은 남은 미션 개수다. 숫자는 화면이 채운다.
 */
export const nudge = {
  earn: "미션 {n}개 하러 가기",
  spend: "오늘 쓸 계획 적기",
};
