/** 학습 계약 — CTR-002 의 일부 */

/** 학습·나무·실천이 공유하는 고정 4영역 (SRS §6.2.1) */
export type Topic = "EARN" | "SPEND" | "SAVE" | "GROW";

export const TOPIC_LABEL: Record<Topic, string> = {
  EARN: "벌기", SPEND: "잘 쓰기", SAVE: "모으기", GROW: "불리기",
};

export const TOPIC_ICON: Record<Topic, string> = {
  EARN: "🌳", SPEND: "🌿", SAVE: "🌱", GROW: "🌱",
};

export type TopicProgressView = {
  readonly topic: Topic;
  readonly label: string;
  readonly icon: string;
  readonly completed: number;
  readonly total: number;
  readonly quizCorrect: number;
  /**
   * 🔴 **학습과 실천을 가른다** (SRS `isPracticeOpen(topic)` · AC-2.4).
   *    「불리기」는 **배우는 건 열려 있고 실천만 닫혀 있다.** 실천이 닫힌 이유는
   *    그 영역의 실천이 **적금 가입~만기**여서, 실제 금융상품 없이는 인정할 수 없기 때문이다.
   *    예전엔 영역 전체를 잠가 아이가 **배울 기회조차 없었다** — 명세보다 더 잠근 것이다.
   */
  readonly practiceOpen: boolean;
};

/** 실천 경로가 열린 영역인가 — 화면이 「곧 열려요」를 보이려면 여기를 본다 (AC-2.4) */
export const isPracticeOpen = (topic: Topic) => topic !== "GROW";
