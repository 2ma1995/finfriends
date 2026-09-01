// 🔴 학습 콘텐츠는 `@/contracts/lessons`, 진도는 DB(`@/modules/learning`)가 준다.
// 여기 남은 것은 문구뿐이다.

export const notice = "퀴즈만으로는 자라지 않습니다. 배운 걸 한 번 해봐야 나무가 자라요.";
/** 🔴 배우는 건 열려 있다. 「곧 열려요」는 **실천**에만 붙는다 (AC-2.4) */
export const practiceSoonLabel = "실천은 곧 열려요";
export const practiceSoonBody =
  "불리기는 배우는 것부터 해요. 「해봤어요」는 저금통이 준비되면 열려요.";
export const startLabel = "시작하기";
export const continueLabel = "이어보기";
export const doneLabel = "다 봤어요";
export const readLabel = "읽었어요";
export const quizLabel = "퀴즈 풀기";
/** 🔴 실천은 한 화면에 모은다 — 영역마다 흩어 놓으면 아이가 네 군데를 돌아다녀야 한다 */
export const practiceCta = "실천하기";
export const practiceHint = "네 가지 실천을 한 화면에서 봐요";
export const tryTitle = "오늘 해볼 것";
/** 🔴 별은 지식이 아니라 **행동**에 붙는다. 퀴즈를 틀려도 이 길은 열려 있다 (D16) */
export const practice = {
  claim: "해봤어요",
  waiting: "부모님 확인을 기다려요",
  waitingBody: "확인되면 ⭐ 1개가 붙어요",
  done: "✓ 별을 받았어요",
  rejected: "이번엔 별이 안 붙었어요. 다시 해볼까요?",
  claimed: "올렸어요. 부모님이 확인하면 별이 붙어요.",
  hint: "퀴즈를 틀려도 괜찮아요. 해보면 별을 받을 수 있어요.",
};
/**
 * 🔴 **이제 읽기 다음은 언제나 문제다** (D47). 예전엔 마지막 편일 때만 퀴즈로 갔고
 *    그 전엔 다음 편으로 넘어갔다 — 그래서 한 자리에서 다 읽을 수 있었다.
 *    **버튼이 어디로 가는지 미리 말한다.** 눌러 보고 아는 건 늦다.
 */
export const finishLabel = "다 읽었어요 · 오늘의 문제로";
export const progressLabel = (done: number, total: number, quiz: number) =>
  `${done} / ${total}편 · 퀴즈 ${quiz}개`;

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };

/**
 * 하루 한 편 — 어긋남 대장 D47.
 *
 * 🔴 **왜 못 여는지 말한다.** 회색으로만 만들면 아이는 「고장났나」로 읽는다.
 * 🔴 **「그만해」가 아니다.** 오늘 몫을 다 한 것은 잘한 것이고, 내일 또 온다고 닫는다.
 */
export const todayBadge = "오늘 읽을 이야기";
export const lockedBadge = "내일 열려요";
export const readDoneToday = "오늘 읽기는 다 했어요. 내일 새 이야기가 와요.";
export const dailyRule = "이야기는 하루에 한 편씩 열려요.";

/** 주소로 직접 들어온 아이에게 — 🔴 「안 돼요」로 끝내지 않는다 (ACE-1.1) */
export const lockedLesson = {
  title: "이 이야기는 아직이에요",
  body: "이야기는 하루에 한 편씩 열려요. 내일 다시 와요.",
};
