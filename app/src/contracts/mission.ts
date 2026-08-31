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
};

export type MissionBoardView = {
  readonly todo: readonly MissionView[];
  readonly waiting: readonly MissionView[];
  readonly settled: readonly MissionView[];
};
