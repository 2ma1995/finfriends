import "server-only";
import { prisma } from "@/db";
import { getTopicProgress } from "@/modules/learning";
import { countWaiting } from "@/modules/mission";
import { TOPIC_LABEL, type Topic } from "@/contracts/learning";
import {
  STAGE_EMOJI, STAGE_LABEL, STAGE_LADDER, nextRule, stageFor, subjectParticle,
  type ForestView, type Stage, type TreeSlotView, type TreeView,
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
    // 🔴 미션 표를 직접 보지 않는다. mission 모듈의 공개 함수를 부른다 (스킬 301 §5)
    countWaiting(childId),
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
    const learn = pr?.completed ?? 0;
    const quiz = pr?.quizCorrect ?? 0;

    /**
     * 🔴 **단계를 지금 계산한다.** `tree_states.stage` 를 읽던 것을 바꿨다 —
     *    그 값을 올려 주는 승급 엔진(GRW-001)이 없어서 **모든 칸이 영원히 씨앗**이었다.
     *    조건을 다 채워도 씨앗이면 화면이 거짓을 말한다.
     *
     *    읽는 시점에 계산하면 저장 없이도 맞는다. GRW-001 이 붙으면 그때
     *    `tree_states.stage` 에 쓰고 `tree_state_changed` 이벤트를 적재한다 —
     *    그 이벤트가 있어야 정체 판정(GRW-002)과 월말 스냅샷(GRW-004)이 성립한다.
     */
    const stage = stageFor(learn, quiz, practiceCount);
    const next = nextRule(stage);

    return {
      topic,
      label: TOPIC_LABEL[topic],
      // 🔴 단계 이모지. 영역 이모지를 쓰면 씨앗인데 🌳 가 나온다
      icon: STAGE_EMOJI[stage],
      stage,
      nextStageLabel: next
        ? `${STAGE_LABEL[next.stage]}${subjectParticle(STAGE_LABEL[next.stage])} 되기까지`
        : null,
      // 게이지는 **다음 단계 조건**을 향한다. 최고 단계면 마지막 조건을 그대로 둔다
      conditions: [
        { label: "학습", current: learn, required: next?.learn ?? STAGE_LADDER[STAGE_LADDER.length - 1].learn },
        { label: "퀴즈", current: quiz, required: next?.quiz ?? STAGE_LADDER[STAGE_LADDER.length - 1].quiz },
        {
          label: PRACTICE_LABEL[topic],
          current: practiceCount,
          required: next?.practice ?? STAGE_LADDER[STAGE_LADDER.length - 1].practice,
        },
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
    /**
     * 「했어요」를 눌렀고 아직 판정되지 않은 미션 수.
     * 🔴 `practice_credits` 를 세면 안 된다 — 그것은 **이미 승인된** 실천이다.
     *    한동안 그렇게 세어 「승인 대기 1건」이 거짓으로 떴다.
     */
    pendingApprovals,
  };
}

// ─────────────────────────────────────────────────────────────
// 월간 숲 — GRW-005 · REQ-FUNC-009
// ─────────────────────────────────────────────────────────────

const YM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * 🔴 **월말 스냅샷 배치(GRW-004)가 아직 없다.** 그래서 `forest_snapshots` 는 비어 있고
 *    전월 비교는 「다음 달부터」로 나간다. 없는 비교를 0으로 그리지 않는다 (AC-E2).
 *
 * 「이번 달 획득 별」은 스냅샷이 없어도 **원장에서 직접 셀 수 있다.** 그것이
 *    AC-1.4 가 요구하는 유일한 누적 증거이므로 배치를 기다리지 않고 지금 보여준다.
 */
export async function getForestView(childId: string, childName: string): Promise<ForestView> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevYm = YM(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [earned, spent, states, prev] = await Promise.all([
    prisma.starLedgerEntry.aggregate({
      where: { childId, createdAt: { gte: monthStart }, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    prisma.starLedgerEntry.aggregate({
      where: { childId, createdAt: { gte: monthStart }, delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    prisma.treeState.findMany({
      where: { childId },
      select: { slot: true, stage: true },
    }),
    prisma.forestSnapshot.findUnique({
      where: { childId_yearMonth: { childId, yearMonth: prevYm } },
      select: { deltaItems: true },
    }),
  ]);

  const stageBy = new Map(states.map((s) => [s.slot as Topic, s.stage]));
  const starsEarned = earned._sum.delta ?? 0;
  const starsSpent = Math.abs(spent._sum.delta ?? 0);

  return {
    childName,
    monthLabel: `${now.getMonth() + 1}월`,
    starsEarned,
    starsSpent,
    slotStages: ORDER.map((topic) => {
      const st = ((stageBy.get(topic) ?? 0) as Stage);
      return { label: TOPIC_LABEL[topic], stage: `${STAGE_EMOJI[st]} ${STAGE_LABEL[st]}` };
    }),
    hasPrevMonth: prev !== null,
    // 스냅샷의 델타는 배치가 만든다. 없으면 빈 배열이고 화면은 비교 자리를 대체 문구로 채운다
    deltas: [],
    noActivity: starsEarned === 0 && starsSpent === 0,
  };
}
