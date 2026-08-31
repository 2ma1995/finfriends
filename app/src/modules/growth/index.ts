import "server-only";
import { prisma } from "@/db";
import { getTopicProgress } from "@/modules/learning";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import {
  STAGE_RULE_EXAMPLE, type Stage, type TreeSlotView, type TreeView,
} from "@/contracts/growth";

/**
 * 성장 나무 읽기 — GRW-003.
 *
 * 🔴 **이 모듈은 실천을 인정하지 않는다.** 결과를 읽기만 한다 (스킬 301 §6).
 *    승급 판정(GRW-001)·정체 판정(GRW-002)은 아직 없다. 그래서 `stage` 는 DB 값을
 *    그대로 읽고, `stalledDays` 는 항상 null 이다 — **없는 판정을 있는 척하지 않는다.**
 *
 * 🔴 identity 와 조인하지 않는다. 아이 이름은 호출자가 `findChild` 로 따로 읽어 넘긴다
 *    (REQ-NF-009 · 결합 조회 0건).
 */

const ORDER: readonly Topic[] = ["EARN", "SPEND", "SAVE", "GROW"];

/** 실천 라벨은 영역마다 다르다 — 「미션 실천」과 「계획 지키기」는 같은 말이 아니다 */
const PRACTICE_LABEL: Record<Topic, string> = {
  EARN: "미션 실천",
  SPEND: "계획 지키기",
  SAVE: "모으기 실천",
  GROW: "실천",
};

/**
 * 아이가 생기면 4영역 나무를 함께 만든다.
 *
 * 🔴 4영역은 **고정**이다 (§6.2.1). 활동이 없어도 칸은 존재해야 한다 —
 *    없으면 화면이 「아직 안 만들어진 것」과 「아직 안 자란 것」을 구별할 수 없다.
 *    호출은 멱등이다. 이미 있으면 아무 일도 하지 않는다.
 */
export async function ensureTreeStates(childId: string): Promise<void> {
  const cycleStartedAt = new Date();
  await prisma.treeState.createMany({
    data: ORDER.map((slot) => ({ childId, slot, cycleStartedAt })),
    skipDuplicates: true,
  });
}

export async function getTreeView(childId: string, childName: string): Promise<TreeView> {
  const [states, progress, practices, pendingApprovals] = await Promise.all([
    prisma.treeState.findMany({
      where: { childId },
      select: { slot: true, stage: true, practiceCount: true, stallDays: true },
    }),
    getTopicProgress(childId),
    prisma.practiceCredit.groupBy({
      by: ["topic"],
      where: { childId },
      _count: { _all: true },
    }),
    prisma.practiceCredit.count({ where: { childId, approvalMode: "parent" } }).catch(() => 0),
  ]);

  const stateBy = new Map(states.map((s) => [s.slot as Topic, s]));
  const progressBy = new Map(progress.map((p) => [p.topic, p]));
  const practiceBy = new Map(
    practices.filter((p) => p.topic !== null).map((p) => [p.topic as Topic, p._count._all]),
  );

  const slots: TreeSlotView[] = ORDER.map((topic) => {
    const st = stateBy.get(topic);
    const pr = progressBy.get(topic);
    // 원장에 남은 실천 건수를 쓴다. tree_states.practiceCount 는 GRW-001 이 채울 값이다
    const practiceCount = practiceBy.get(topic) ?? st?.practiceCount ?? 0;

    return {
      topic,
      label: TOPIC_LABEL[topic],
      icon: TOPIC_ICON[topic],
      stage: ((st?.stage ?? 0) as Stage),
      conditions: [
        { label: "학습", current: pr?.completed ?? 0, required: STAGE_RULE_EXAMPLE.learn },
        { label: "퀴즈", current: pr?.quizCorrect ?? 0, required: STAGE_RULE_EXAMPLE.quiz },
        { label: PRACTICE_LABEL[topic], current: practiceCount, required: STAGE_RULE_EXAMPLE.practice },
      ],
      // 🔴 GRW-002 가 없다. 판정하지 않은 것을 정체로 표시하지 않는다
      stalledDays: null,
      locked: topic === "GROW",
    };
  });

  const noActivity = slots.every((s) => s.conditions.every((c) => c.current === 0));

  return {
    childName,
    // 주기 라벨은 GRW-001 의 주기 관리가 붙으면 실제 주기로 바뀐다
    cycleLabel: `${new Date().getMonth() + 1}월`,
    slots,
    noActivity,
    pendingApprovals,
  };
}
