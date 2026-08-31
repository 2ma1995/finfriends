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

/**
 * 승급 사다리 — SRS 다이어그램 B.
 *
 *   씨앗 → 새싹 : 학습 완주 + 퀴즈 정답 + 실천 1회
 *   새싹 → 나무 : 학습 3회 + 퀴즈 5개 + 실천 1회
 *
 * 🔴 **실천이 0이면 어떤 단계로도 오르지 않는다.** 학습·퀴즈를 100번 해도 그렇다
 *    (REQ-FUNC-001 · 실천 없이는 자라지 않는다). 그것이 이 제품의 근거다.
 *
 * 🔴 값과 단계 수는 **예시값**이다 — D6 미결이고 변경 대장 #14 가
 *    「새싹 · 나무 · 꽃 나무 · 열매 나무」 4단계를 제안한 채 결정 대기다.
 *    확정되면 이 배열 한 곳만 고친다.
 */
export const STAGE_LADDER = [
  { stage: 1 as Stage, learn: 1, quiz: 1, practice: 1 },
  { stage: 2 as Stage, learn: 3, quiz: 5, practice: 1 },
] as const;

/** 지금 조건으로 오를 수 있는 최고 단계. 아래에서 위로 올라가며 마지막으로 통과한 칸 */
export function stageFor(learn: number, quiz: number, practice: number): Stage {
  let reached: Stage = 0;
  for (const r of STAGE_LADDER) {
    if (learn >= r.learn && quiz >= r.quiz && practice >= r.practice) reached = r.stage;
    else break;
  }
  return reached;
}

/** 다음 단계의 조건. 최고 단계면 null */
export function nextRule(stage: Stage) {
  return STAGE_LADDER.find((r) => r.stage > stage) ?? null;
}

/** 받침이 있으면 「이」, 없으면 「가」 — 「새싹가 되기까지」로 나가면 안 된다 */
export function subjectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "가";
  return code % 28 === 0 ? "가" : "이";
}

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
  /** 「나무가 되기까지」처럼 다음 목표를 알려준다. 최고 단계면 null */
  readonly nextStageLabel: string | null;
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

// ─────────────────────────────────────────────────────────────
// 월간 숲 — GRW-005 · REQ-FUNC-009
//
// 🔴 초기화되지 않고 **누적**된다. 나무는 주기마다 비워지지만 숲은 쌓인다 —
//    전월 대비 델타가 「성장 증거」이고, 별을 즉시 소진하는 아이에게
//    **총 획득 별이 유일한 누적 증거**다 (AC-1.4).
// ─────────────────────────────────────────────────────────────

export type ForestDelta = {
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly improved: boolean;
};

export type ForestView = {
  readonly childName: string;
  readonly monthLabel: string;
  /** 🔴 스크롤 없이 보여야 한다 (AC-1.4). 잔액이 아니라 **이번 달 번 별**이다 */
  readonly starsEarned: number;
  /** 이번 달 쓴 별 — 잔액이 0인 이유를 설명한다. 없으면 0 */
  readonly starsSpent: number;
  readonly slotStages: readonly { readonly label: string; readonly stage: string }[];
  /**
   * 🔴 전월 스냅샷이 없으면 **델타를 0으로 그리지 않는다** (AC-E2).
   *    0으로 그리면 보호자는 「변화 없음」이 아니라 「고장」으로 읽는다.
   */
  readonly hasPrevMonth: boolean;
  readonly deltas: readonly ForestDelta[];
  /** 이번 달 기록이 아무것도 없다 — 빈 상태로 간다 */
  readonly noActivity: boolean;
};
