// 🔴 학습 콘텐츠는 `@/contracts/lessons`, 진도는 DB(`@/modules/learning`)가 준다.
// 여기 남은 것은 문구뿐이다.

export const notice = "퀴즈만으로는 자라지 않습니다. 배운 걸 한 번 해봐야 나무가 자라요.";
export const lockedLabel = "곧 열려요";
export const startLabel = "시작하기";
export const continueLabel = "이어보기";
export const doneLabel = "다 봤어요";
export const readLabel = "읽었어요";
export const quizLabel = "퀴즈 풀기";
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
export const finishLabel = "다 읽었어요";
export const lastFinishLabel = "다 읽었어요 · 퀴즈로";
export const progressLabel = (done: number, total: number, quiz: number) =>
  `${done} / ${total}편 · 퀴즈 ${quiz}개`;

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
