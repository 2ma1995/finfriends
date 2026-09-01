// 🔴 데이터는 DB(`@/modules/practice`)가 준다. 여기 남은 것은 문구뿐이다.

export const title = "실천하기";
export const sub = "오늘 할 일 네 가지";
/** 🔴 여기서 하는 것은 **배운 것 해보기**다. 부모가 준 미션과 다르다는 것을 먼저 말한다 */
export const intro = "배운 걸 해보면 ⭐를 받아요. 부모님이 준 미션은 「벌기」 칸에 있어요.";

/** 🔴 「배우고 → 해본다」가 이 제품의 규칙이다. 안 배웠으면 실천할 것이 없다 */
export const needsLesson = "먼저 한 편 읽어요";
export const readFirst = "배우러 가기 →";

export const claim = "해봤어요";
export const waiting = "부모님 확인 중";
export const done = "✓ 별 받았어요";
export const rejected = "다시 해볼까요?";

export const quizToday = "오늘의 문제";
export const quizDone = "오늘 문제 다 풀었어요";
/**
 * 🔴 **왜 「오늘의 문제」가 넷인지 화면이 말한 적이 없다.** `FR-011` 은
 *    **「분야별 1일 1개 · 총 4개」**다 — 하루 한 개는 **칸마다**이지 전체가 아니다.
 *    안 적으면 「하루 하나라며 왜 넷이야」가 된다. 실제로 그렇게 읽혔다.
 */
export const quizRule = "문제는 칸마다 하루 한 개예요. 넷 다 안 풀어도 괜찮아요.";

/** 🔴 불리기는 미션이 아니라 저금으로 실천한다 (D25) */
export const savingsCta = "저금하러 가기 →";
export const savingsNone = "저금을 시작하면 실천이 돼요";

/** 🔴 눌렀으면 무슨 일이 일어났는지 말한다. 조용히 바뀌면 「눌렸나?」가 된다 */
export const claimed = "올렸어요! 부모님이 확인하면 별이 붙어요.";

/**
 * 🔴 **미션과 실천은 아이 눈에 똑같아 보인다.** 둘 다 「하고 → 눌러서 → 별」이다.
 *    구분되는 것은 **돈이 붙느냐**뿐이고, 그건 아이에게 제일 큰 차이다.
 *    그래서 말로 못박는다 — 다른 설명을 백 줄 적는 것보다 이 한 줄이 낫다.
 */
export const missionNone = "부모님이 준 미션 보기";
/**
 * 🔴 **「미션은 돈이 붙어요」라고 적었다가 고쳤다.** 부모가 금액을 0으로도 만들 수 있어
 *    (`payoutWon` 이 선택 입력이다) **거짓이 될 수 있는 문장**이었다.
 *    실제로 tester 의 미션 한 건이 0원이었다. 늘 참인 것만 적는다 —
 *    **누가 냈는가**는 언제나 참이다.
 */
export const missionDiff = "미션은 부모님이 만들어 주신 거예요";

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
