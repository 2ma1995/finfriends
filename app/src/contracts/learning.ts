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
  /** 🔴 불리기는 실천 경로가 아직 없다 (§6.2.1) */
  readonly locked: boolean;
};
