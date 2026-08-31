import type { Topic } from "./learning";

/** 미션 계약 — CTR-002 의 일부 */

export type MissionState = "PENDING" | "APPROVED" | "BACKFILLED" | "REJECTED";

/** 아이 화면에서 미션이 놓이는 자리 */
export type MissionBucket =
  /** 아직 안 함 — 오늘 할 수 있는 것 */
  | "TODO"
  /** 「했어요」를 눌렀고 부모 승인을 기다림. 🔴 「미실천」과 시각적으로 구별한다 */
  | "WAITING"
  /** 승인됨 — 별을 받았다 */
  | "DONE"
  /** 거절됨 — 사유를 보여준다. 「미실천」과 구별한다 */
  | "REJECTED";

export type MissionView = {
  readonly id: string;
  readonly title: string;
  readonly topic: Topic;
  readonly topicLabel: string;
  readonly icon: string;
  readonly reward: number;
  readonly bucket: MissionBucket;
  readonly whenLabel: string | null;
  readonly rejectReason: string | null;
  /** 승인이 늦어 소급된 것 — 「기다린 만큼 그대로 반영됐어요」 */
  readonly backfilled: boolean;
  /**
   * 🔴 **아이가 배우고 스스로 올린 것인가.** 보호자가 만든 미션과 갈라 보여준다 —
   *    같아 보이면 보호자는 자기가 시킨 줄 알고, 아이가 스스로 한 것을 못 알아본다.
   */
  readonly fromLesson: boolean;
};

export type MissionBoardView = {
  readonly todo: readonly MissionView[];
  readonly waiting: readonly MissionView[];
  readonly settled: readonly MissionView[];
};

// ─────────────────────────────────────────────────────────────
// 미션 만들기 — PRC-001 보호자 쪽. §6.1 진입점 4번 `createMission`
//
// 🔴 REQ-FUNC-002 는 「보호자가 조건과 **금액**을 사전 설정」이라고 적었는데
//    `missions` 표에는 금액 칸이 없다 (별만 있다). 별과 현금은 완전히 분리된
//    재화이므로(P-01 · P-21) 금액을 지금 임의로 붙이지 않고 어긋남으로 남긴다.
// ─────────────────────────────────────────────────────────────

/** 별 보상 범위. 미션 하나에 몰아주면 나무가 실천 없이 자란 것처럼 보인다 */
export const REWARD_MIN = 1;
export const REWARD_MAX = 5;

/** 조건은 아이가 읽고 판단할 문장이다 — 길면 무슨 뜻인지 모른다 (P-12) */
export const TITLE_MAX = 40;

/** 한 아이에게 열려 있는 미션 상한. 넘치면 아이가 무엇부터 할지 못 고른다 */
export const OPEN_LIMIT = 10;

export type CreateMissionInput = {
  readonly title: string;
  readonly topic: Topic;
  readonly reward: number;
};

export type CreateMissionError =
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "TOPIC_INVALID"
  | "REWARD_OUT_OF_RANGE"
  | "TOO_MANY_OPEN"
  | "NO_CHILD"
  /** 🔴 「불리기」는 실천 경로가 닫혀 있다 (F15 · P-20) */
  | "TOPIC_LOCKED";

export const CREATE_MISSION_MESSAGES: Record<CreateMissionError, string> = {
  TITLE_REQUIRED: "무엇을 하면 되는지 적어 주세요.",
  TITLE_TOO_LONG: `조건은 ${TITLE_MAX}자까지 쓸 수 있어요. 아이가 읽을 문장입니다.`,
  TOPIC_INVALID: "영역을 하나 골라 주세요.",
  TOPIC_LOCKED: "「불리기」는 아직 실천 경로가 열리지 않았어요.",
  REWARD_OUT_OF_RANGE: `별은 ${REWARD_MIN}개에서 ${REWARD_MAX}개까지 정할 수 있어요.`,
  TOO_MANY_OPEN: `아직 안 한 미션이 ${OPEN_LIMIT}개예요. 하나를 마치면 새로 만들 수 있어요.`,
  NO_CHILD: "등록한 아이가 없어요.",
};

export type CreateMissionResult =
  | { readonly ok: true; readonly missionId: string }
  | { readonly ok: false; readonly reason: CreateMissionError };
