import { josa } from "@/lib/korean";
import type { Topic } from "@/contracts/learning";

/**
 * 성장 나무 계약 — GRW-003 의 읽기 표면.
 *
 * 🔴 **단계 수와 임계값이 확정됐다** — `FR-030` 조건표. 오래 `D6` 미결이라 3단계에
 *    예시값을 두고 화면에 「예시값」이라 적어 뒀는데, 새 SRS 가 4단계로 확정했다
 *    (어긋남 대장 `D30`). `tree_states.stage` 를 정수로 둔 덕에 마이그레이션이 붙지 않는다.
 *
 * 🔴 승급 판정 엔진(GRW-001)은 아직 없다. 그래서 단계를 **읽는 시점에 계산**한다 —
 *    `modules/growth.getTreeView` 참조. 저장된 `stage` 를 올려 주는 사람이 없어서다.
 */

export type Stage = 0 | 1 | 2 | 3;

/**
 * 🔴 **4단계다** — `FR-030`. 한동안 3단계(씨앗·새싹·나무)에 임계값도 예시값이었다.
 *    D6 미결이라 정하지 못했던 것인데 새 SRS 가 표로 확정했다 (어긋남 대장 D30).
 *
 * 🔴 **0단계가 「씨앗」이 아니라 「새싹」이다.** 아무것도 안 한 아이도 새싹에서 시작한다 —
 *    시작점이 「아직 아무것도 아님」이면 첫 화면부터 뒤처진 것으로 읽힌다.
 */
export const STAGE_LABEL: Record<Stage, string> = {
  0: "새싹", 1: "나무", 2: "꽃나무", 3: "열매나무",
};

/** 🔴 이모지는 **단계**를 따른다. 영역을 따르면 새싹인데 🍎 가 나온다 */
export const STAGE_EMOJI: Record<Stage, string> = {
  0: "🌱", 1: "🌳", 2: "🌸", 3: "🍎",
};

/**
 * 승급 사다리 — `FR-030` 확정 조건표.
 *
 * | 단계 | 학습 | 퀴즈 | 실천 (벌기·쓰기 / 모으기 / 불리기) |
 * | 🌱 새싹 | 0 | 0 | 0 / 0 / 0 |
 * | 🌳 나무 | 5 | 4 | 2 / 1 / 1 |
 * | 🌸 꽃나무 | 10 | 8 | 5 / 2 / 1 |
 * | 🍎 열매나무 | 15 | 12 | 8 / 3 / 1 |
 *
 * 🔴 **실천 조건이 영역마다 다르다.** 벌기·잘 쓰기는 자주 할 수 있는 일이고
 *    모으기·불리기는 그렇지 않다 — 같은 숫자를 요구하면 불리기 나무는 영영 안 자란다.
 *    그래서 `stageFor` 가 영역을 함께 받는다.
 *
 * 🔴 **세 조건을 모두 채워야 오른다.** 학습·퀴즈를 아무리 채워도 실천이 모자라면
 *    그 자리에 머문다 (`AC-030-1`). 그것이 이 제품의 근거다.
 */
export const PRACTICE_BY_TOPIC: Record<Topic, readonly [number, number, number]> = {
  // [나무, 꽃나무, 열매나무]
  EARN:  [2, 5, 8],
  SPEND: [2, 5, 8],
  SAVE:  [1, 2, 3],
  GROW:  [1, 1, 1],
};

export const STAGE_LADDER = [
  { stage: 1 as Stage, learn: 5,  quiz: 4  },
  { stage: 2 as Stage, learn: 10, quiz: 8  },
  { stage: 3 as Stage, learn: 15, quiz: 12 },
] as const;

/** 그 영역에서 이 단계로 오르는 데 필요한 실천 횟수 */
export function practiceNeeded(topic: Topic, stage: Stage): number {
  return stage === 0 ? 0 : PRACTICE_BY_TOPIC[topic][stage - 1];
}

/** 지금 조건으로 오를 수 있는 최고 단계. 아래에서 위로 올라가며 마지막으로 통과한 칸 */
export function stageFor(topic: Topic, learn: number, quiz: number, practice: number): Stage {
  let reached: Stage = 0;
  for (const r of STAGE_LADDER) {
    const need = practiceNeeded(topic, r.stage);
    if (learn >= r.learn && quiz >= r.quiz && practice >= need) reached = r.stage;
    else break;
  }
  return reached;
}

/** 다음 단계의 조건. 최고 단계면 null — 영역마다 실천 조건이 다르다 */
export function nextRule(topic: Topic, stage: Stage) {
  const r = STAGE_LADDER.find((x) => x.stage > stage);
  return r ? { ...r, practice: practiceNeeded(topic, r.stage) } : null;
}

/** 최고 단계에서 게이지를 채워 둘 때 쓰는 마지막 조건 */
export function topRule(topic: Topic) {
  const last = STAGE_LADDER[STAGE_LADDER.length - 1];
  return { ...last, practice: practiceNeeded(topic, last.stage) };
}

/**
 * 받침이 있으면 「이」, 없으면 「가」 — 「새싹가 되기까지」로 나가면 안 된다.
 * 🔴 판정은 `lib/korean.josa` 하나로 한다. 같은 규칙을 두 곳에 두면 한쪽만 고쳐진다.
 */
export const subjectParticle = (word: string) => josa(word, "이", "가");

export type Condition = {
  readonly label: string;
  readonly current: number;
  readonly required: number;
};

export type TreeSlotView = {
  readonly topic: Topic;
  readonly label: string;
  /** 🔴 단계 이모지다. 영역 이모지가 아니다 */
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
  /**
   * 🔴 별 원장에서 **정합성이 깨진 줄** 수 (`FR-012` · `AC-012-3`).
   *    0이면 화면에 자리가 없다. 있으면 **숨기지 않는다** —
   *    보호자가 모르는 채로 두면 「별이 왜 이래」를 아이에게 묻게 된다.
   */
  readonly quarantinedStars: number;
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
