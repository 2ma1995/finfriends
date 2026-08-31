import type { Topic } from "@/contracts/learning";

/**
 * 성장 나무 계약 — GRW-003 의 읽기 표면.
 *
 * 🔴 **단계 수와 승급 임계값은 확정 사양이 아니다** — D6 미결이고, 변경 대장 #14 가
 *    「새싹 · 나무 · 꽃 나무 · 열매 나무」 4단계를 제안한 채 결정 대기다.
 *    그래서 화면에 **「예시값」**을 적는다 (원장 T9 · 스킬 401).
 *    `tree_states.stage` 를 정수로 둔 것도 같은 이유다 — 이름이 바뀌어도 마이그레이션이 붙지 않는다.
 *
 * 🔴 승급 판정 엔진(GRW-001)은 아직 없다. 그래서 `stage` 는 DB 에 있는 값을 그대로 읽고
 *    누구도 올려 주지 않는다. 화면이 그 사실을 숨기지 않는다.
 */

export type Stage = 0 | 1 | 2;

export const STAGE_LABEL: Record<Stage, string> = { 0: "씨앗", 1: "새싹", 2: "나무" };

/** 🔴 예시값. 확정되면 여기 한 곳만 고친다 */
export const STAGE_RULE_EXAMPLE = { learn: 3, quiz: 5, practice: 1 } as const;

export type Condition = {
  readonly label: string;
  readonly current: number;
  readonly required: number;
};

export type TreeSlotView = {
  readonly topic: Topic;
  readonly label: string;
  readonly icon: string;
  readonly stage: Stage;
  readonly conditions: readonly Condition[];
  /** 14일 이상 그대로면 정체. 판정 엔진(GRW-002)이 없으면 null 이다 */
  readonly stalledDays: number | null;
  /** 🔴 불리기는 실천 경로가 닫혀 있다 (F15 · P-20) */
  readonly locked: boolean;
};

export type TreeView = {
  readonly childName: string;
  readonly cycleLabel: string;
  readonly slots: readonly TreeSlotView[];
  /** 학습·퀴즈·실천이 전부 0 — US-1 AC-E1 의 빈 상태 조건이다 */
  readonly noActivity: boolean;
  /** 승인 대기 미션 수. 조건부 슬롯이므로 0이면 화면에 자리도 없다 */
  readonly pendingApprovals: number;
};
