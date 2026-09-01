import "server-only";
import { prisma } from "@/db";
import { getTopicProgress } from "@/modules/learning";
import { countWaiting } from "@/modules/mission";
import { reconcileStars } from "@/modules/star-ledger";
import { TOPIC_LABEL, type Topic } from "@/contracts/learning";
import {
  STAGE_EMOJI, STAGE_LABEL, STALL_DAYS, blockedBy, nextRule, stageFor,
  subjectParticle, topRule,
  type ForestView, type Stage, type TreeSlotView, type TreeView,
} from "@/contracts/growth";

/**
 * 성장 나무 읽기 — GRW-003.
 *
 * 🔴 **이 모듈은 실천을 인정하지 않는다.** 결과를 읽기만 한다 (스킬 301 §6).
 *    실천을 적는 것은 `mission` · `plan` · `savings` 쪽이다.
 *
 * 🔴 **단계는 읽는 시점에 계산한다.** 승급 판정 엔진(GRW-001)이 없어서
 *    `tree_states.stage` 를 올려 주는 사람이 없기 때문이다 — 저장값을 읽으면
 *    조건을 다 채워도 영원히 새싹이다. 실제로 그랬다.
 *
 * 🔴 **정체 판정이 있다** (`GRW-002` · 어긋남 대장 D55).
 *    주기 시작 후 `STALL_DAYS`(14일) 이상 지났고 **한 칸도 안 올랐으면** 정체다.
 *
 * 🔴 **주기 전환과 월말 스냅샷은 있다** — `rollCycleIfNeeded` (어긋남 대장 D39).
 *    `pg_cron` 이 없어 화면을 열 때 부른다.
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
  // 🔴 날짜 컬럼이다. 지금 시각을 그대로 넣으면 시간대에 따라 하루 밀려 저장된다
  const now = new Date();
  const cycleStartedAt = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  await prisma.treeState.createMany({
    data: ORDER.map((slot) => ({ childId, slot, cycleStartedAt })),
    skipDuplicates: true,
  });
}

export async function getTreeView(childId: string, childName: string): Promise<TreeView> {
  /**
   * 🔴 **읽기 전에 주기를 넘긴다.** 안 넘기면 지난달 실천이 이번 달 나무에 남아
   *    나무가 한 번 열매나무가 되면 영원히 열매나무다 (`AC-030-3`).
   *
   * 🔴 **별 원장도 여기서 대조한다.** 「별 원장 정합성 오류 0%」가 허용 오차 0인
   *    항목인데 재는 사람이 없었다 (`FR-012`). 어긋난 줄이 있을 때만 쓴다.
   *
   *    둘 다 `pg_cron` 이 붙으면 배치가 부르면 되고 이 함수는 안 바뀐다.
   */
  await rollCycleIfNeeded(childId);
  const audit = await reconcileStars(childId);

  const [states, progress, practices, pendingApprovals] = await Promise.all([
    prisma.treeState.findMany({
      where: { childId },
      select: { slot: true, stage: true, practiceCount: true, stallDays: true, cycleStartedAt: true },
    }),
    getTopicProgress(childId),
    /**
     * 🔴 **`approvalMode` 로 걸러내지 않는다** — 자동 완료(`"auto"`)도 실천으로 센다.
     *    사용자 결정 (2026-09-01 · 어긋남 대장 `D51`).
     *
     *    `ADR-006`(실천 필수 승급)의 뜻은 「학습만으로는 안 자란다」였다.
     *    자동 완료도 **아이가 실제로 「했어요」를 누른 것**이므로 실천이 없는 게 아니다 —
     *    없는 것은 **부모의 확인**이다.
     *
     * 🔴 **대가를 적어 둔다.** 부모가 아무것도 안 해도 사흘이면 나무가 자란다.
     *    「누가 인정했나」가 근거인 제품에서 아무도 확인하지 않은 실천이 나무를 밀어 올린다.
     *    되돌리려면 `where` 에 `approvalMode: "parent"` 를 더하면 된다 — **한 줄이다.**
     *    지표에서 가려내는 것도 같은 필드로 된다.
     */
    prisma.practiceCredit.groupBy({
      by: ["topic"],
      where: { childId },
      _count: { _all: true },
    }),
    // 🔴 미션 표를 직접 보지 않는다. mission 모듈의 공개 함수를 부른다 (스킬 301 §5)
    countWaiting(childId),
  ]);

  /**
   * 🔴 주기가 시작된 지 며칠인가 — 정체 판정의 분모다.
   *    `cycle_started_at` 은 **날짜 컬럼**이라 UTC 자정으로 저장된다.
   *    같은 방식으로 오늘을 만들어야 시간대 차이만큼 어긋나지 않는다.
   */
  const todayUtc = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const cycleStart = states.reduce(
    (min, s) => (s.cycleStartedAt < min ? s.cycleStartedAt : min), states[0].cycleStartedAt,
  );
  const daysInCycle = Math.max(0, Math.floor((todayUtc - cycleStart.getTime()) / 864e5));

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
    // 🔴 실천 조건은 **영역마다 다르다** (FR-030). 같은 숫자를 요구하면 불리기가 영영 안 자란다
    const stage = stageFor(topic, learn, quiz, practiceCount);
    const next = nextRule(topic, stage);
    const top = topRule(topic);

    const conditions = [
      { label: "학습", current: learn, required: next?.learn ?? top.learn },
      { label: "퀴즈", current: quiz, required: next?.quiz ?? top.quiz },
      { label: PRACTICE_LABEL[topic], current: practiceCount, required: next?.practice ?? top.practice },
    ];

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
      conditions,
      /**
       * 🔴 **정체 — 주기 시작 후 14일 이상 미상승** (`GRW-002`).
       *
       *    나무는 주기마다 비워지므로(`AC-030-3`) **이번 주기에 한 칸도 안 올랐다**는 것이
       *    곧 `stage === 0` 이다. 마지막 승급 시각을 따로 저장할 필요가 없다.
       *
       * 🔴 **아직 14일이 안 됐으면 `null` 이다. 0을 쓰지 않는다** —
       *    0은 「정체 아님」이 아니라 「오늘부터 정체」로 읽힌다.
       *
       * 🔴 **불리기는 정체로 세지 않는다.** 실천 경로가 적금 하나뿐이라
       *    한 달에 한 번 있는 일을 못 했다고 「멈췄다」고 말하면 부모가 아이를 재촉한다.
       */
      stalledDays: stage === 0 && topic !== "GROW" && daysInCycle >= STALL_DAYS
        ? daysInCycle
        : null,
      // 🔴 무엇이 모자라서 안 올랐는가 (AC-030-2). 다 채웠으면 null
      blockedBy: blockedBy(conditions),
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
    /** 🔴 정합성이 깨진 줄이 있으면 숨기지 않는다 (`AC-012-3`) */
    quarantinedStars: audit.totalQuarantined,
  };
}

// ─────────────────────────────────────────────────────────────
// 월간 숲 — GRW-005 · REQ-FUNC-009
// ─────────────────────────────────────────────────────────────

const YM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

type SnapStage = { topic: Topic; label: string; stage: Stage };

/**
 * 전월 대비 변화 — `FR-040`.
 *
 * 🔴 **두 장이 있어야 만들어진다.** 한 장뿐이면 비교 대상이 없으므로 빈 배열이다.
 *    「0 단계 변화」로 그리면 보호자는 **변화 없음이 아니라 고장**으로 읽는다 (`AC-E2`).
 *
 * 🔴 **오른 것만 보여주지 않는다.** 내려간 것도 그대로 적는다 —
 *    좋은 소식만 남기면 이 화면은 성장 증거가 아니라 광고가 된다.
 */
type SnapMetrics = {
  learn?: number; quiz?: number; practice?: number;
  spentWon?: number; savingRate?: number | null;
};

function buildDeltas(snaps: readonly {
  yearMonth: string; finalStages: unknown; deltaItems: unknown; starsEarned: number;
}[]) {
  if (snaps.length < 2) return [];
  const [last, before] = snaps;
  const beforeBy = new Map(
    ((before.finalStages as SnapStage[]) ?? []).map((x) => [x.topic, x.stage]),
  );

  const out = ((last.finalStages as SnapStage[]) ?? []).flatMap((x) => {
    const was = beforeBy.get(x.topic);
    if (was === undefined || was === x.stage) return [];
    return [{
      label: x.label,
      from: STAGE_LABEL[was],
      to: STAGE_LABEL[x.stage],
      improved: x.stage > was,
    }];
  });

  // 별은 단계가 그대로여도 달라진다 — 아이가 별을 즉시 쓰면 이것만 남는 증거다 (AC-1.4)
  if (last.starsEarned !== before.starsEarned) {
    out.push({
      label: "이번 달 별",
      from: `${before.starsEarned}개`,
      to: `${last.starsEarned}개`,
      improved: last.starsEarned > before.starsEarned,
    });
  }

  /**
   * 🔴 **단계 말고도 달라진 것을 보여준다** (`REQ-FUNC-009` — 변화 항목 **7개 이상**).
   *
   *    단계만 보면 리포트가 대개 비어 있다 — 나무 단계는 한 달에 잘 안 바뀐다.
   *    학습·퀴즈·실천·소비·저축률은 **매달 움직이므로** 그것이 실제 변화다.
   *
   * 🔴 **오른 것만 보여주지 않는다.** 내려간 것도 그대로 적는다 —
   *    좋은 소식만 남기면 이 화면은 성장 증거가 아니라 광고가 된다.
   *
   * 🔴 **한쪽에 값이 없으면 건너뛴다.** 없는 것을 0으로 그리면 보호자는
   *    「변화 없음」이 아니라 **「고장」**으로 읽는다 (`AC-E2`).
   */
  const a = (before.deltaItems ?? {}) as SnapMetrics;
  const b = (last.deltaItems ?? {}) as SnapMetrics;

  const rows: readonly { label: string; from?: number | null; to?: number | null; unit: string }[] = [
    { label: "실천 횟수", from: a.practice, to: b.practice, unit: "번" },
    { label: "맞힌 퀴즈", from: a.quiz, to: b.quiz, unit: "개" },
    { label: "읽은 이야기", from: a.learn, to: b.learn, unit: "편" },
    { label: "저축률", from: a.savingRate, to: b.savingRate, unit: "%" },
  ];
  for (const r of rows) {
    if (typeof r.from !== "number" || typeof r.to !== "number" || r.from === r.to) continue;
    out.push({
      label: r.label,
      from: `${r.from}${r.unit}`,
      to: `${r.to}${r.unit}`,
      improved: r.to > r.from,
    });
  }

  // 🔴 소비는 **적은 쪽이 좋은 것이 아니다.** 계획대로 쓰는 것이 목표이므로 방향을 판정하지 않는다
  if (typeof a.spentWon === "number" && typeof b.spentWon === "number" && a.spentWon !== b.spentWon) {
    out.push({
      label: "쓴 돈",
      from: `${a.spentWon.toLocaleString("ko-KR")}원`,
      to: `${b.spentWon.toLocaleString("ko-KR")}원`,
      improved: false,
    });
  }

  return out;
}

/**
 * 월간 숲 — `FR-040`.
 *
 * 🔴 **읽기 전에 주기를 넘긴다.** 안 넘기면 지난달 스냅샷이 없어
 *    전월 비교가 **영원히 「다음 달부터」**다. 실제로 그랬다 (어긋남 대장 D39).
 *
 * 🔴 **비교할 앞 달이 없으면 델타를 0으로 그리지 않는다** (`AC-E2`).
 *    0은 「변화 없음」이 아니라 **「고장」**으로 읽힌다.
 *
 * 「이번 달 획득 별」은 스냅샷과 무관하게 **원장에서 직접 센다.**
 * 별을 즉시 쓰는 아이에게 그것이 유일한 누적 증거다 (`AC-1.4`).
 */
export async function getForestView(childId: string, childName: string): Promise<ForestView> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 🔴 먼저 주기를 넘긴다. 안 넘기면 지난달 스냅샷이 없어 영원히 「다음 달부터」다
  await rollCycleIfNeeded(childId);

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
    // 🔴 **두 달치를 읽는다.** 델타는 「지난달 − 그 전달」이라 한 장으로는 못 만든다
    prisma.forestSnapshot.findMany({
      where: { childId },
      orderBy: { yearMonth: "desc" }, take: 2,
      select: { yearMonth: true, finalStages: true, deltaItems: true, starsEarned: true },
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
    hasPrevMonth: prev.length >= 1,
    /**
     * 🔴 **델타를 읽는 시점에 만든다.** 스냅샷에 저장해 두면 두 곳을 맞춰야 하고,
     *    한쪽만 고쳐지면 「숲은 올랐다는데 나무는 그대로」가 된다.
     *
     * 🔴 비교할 앞 달이 없으면 **빈 배열이다.** 0으로 그리지 않는다 (`AC-E2`) —
     *    0은 「변화 없음」이 아니라 「고장」으로 읽힌다.
     */
    deltas: buildDeltas(prev),
    noActivity: starsEarned === 0 && starsSpent === 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 주기 전환 · 월말 스냅샷 — GRW-004 · AC-030-3 · FR-040 · 어긋남 대장 D39
// ─────────────────────────────────────────────────────────────

const monthStartOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
/** `practice_credits.cycleId` 형식 — 202609 */
const cycleIdOf = (d: Date) => d.getFullYear() * 100 + (d.getMonth() + 1);

/**
 * 🔴 **`cycle_started_at` 은 `date` 컬럼이다** — 시각이 잘린다.
 *    「2026-09-01 00:00 KST」로 넣으면 DB 에는 날짜만 남고, 읽을 때는
 *    **UTC 자정**(`2026-09-01T00:00Z`)으로 돌아온다. 시각으로 비교하면
 *    시간대 차이(KST +9)만큼 어긋나 **주기가 넘어갔는데 안 넘어간 것으로 보인다.**
 *    그래서 **연·월 문자열로 견준다** — 날짜 컬럼에는 날짜의 방식으로 묻는다.
 */
const ymOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/**
 * 🔴 **날짜 컬럼에는 UTC 자정을 쓴다.** 로컬 자정(`new Date(2026, 8, 1)` = KST 9월 1일)을
 *    넣으면 그 순간은 UTC 로 **8월 31일 15시**라, Postgres 가 날짜만 잘라 **8월 31일**을
 *    저장한다 — 9월로 넘겼는데 8월로 적히는 것이다. 실제로 그랬다.
 */
const utcMonthStart = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));

/**
 * 주기가 바뀌었으면 **직전 주기를 숲에 확정하고 나무를 비운다.**
 *
 * 🔴 **없어서 두 가지가 망가져 있었다.**
 *    ① `forest_snapshots` 가 0건이라 월간 숲이 **영원히 「다음 달부터」**였다
 *    ② 나무가 한 번 열매나무가 되면 **영원히 열매나무**였다 — 3월 실천이 12월까지 남는다
 *
 * 🔴 **비우는 것은 실천뿐이다.** 학습·퀴즈는 그대로 둔다 (`D39`).
 *    `completedLessons` 가 읽은 편의 **id 집합**이라 같은 편을 다시 읽어도 진도가 안 오르고,
 *    콘텐츠 양이 한정돼 매달 15편을 새로 읽는 것은 불가능하다.
 *    **매달 새로 해야 하는 것은 실천**이지 학습이 아니다 —
 *    아이는 이미 아는 것이고 다시 증명할 것은 행동이다.
 *
 * 🔴 **`pg_cron` 이 붙으면 배치가 이 함수를 부르면 된다** (`ADR-T02`).
 *    지금은 나무·숲 화면을 열 때 부른다. 함수를 그대로 두므로 옮길 때 화면은 안 바뀐다.
 *
 * 🔴 **여러 달을 건너뛰어도 한 달씩 만든다.** 두 달 쉬었다 돌아온 계정이
 *    중간 달을 통째로 잃으면 숲의 「누적」이 거짓이 된다.
 */
export async function rollCycleIfNeeded(childId: string): Promise<number> {
  const states = await prisma.treeState.findMany({
    where: { childId },
    select: { slot: true, cycleStartedAt: true },
  });
  if (states.length === 0) return 0;

  const now = new Date();
  const thisMonth = monthStartOf(now);
  const oldest = states.reduce(
    (min, s) => (s.cycleStartedAt < min ? s.cycleStartedAt : min), states[0].cycleStartedAt,
  );

  /**
   * 🔴 주기가 안 바뀌었어도 **지난달 스냅샷은 다시 센다.**
   *    이번 달에 승인된 지난달 실천(소급)이 그 달 스냅샷에 들어가야 한다.
   *    안 그러면 「늦게 승인했더니 숲에서 사라졌다」가 된다.
   */
  // 🔴 날짜 컬럼이므로 연·월로 견준다. 시각으로 비교하면 시간대만큼 어긋난다
  const rolled = ymOf(oldest) < YM(thisMonth);
  const from = rolled ? oldest : new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);

  // 지난 주기의 첫날 — UTC 로 읽어야 저장된 날짜와 같은 달이 나온다
  const started = rolled
    ? new Date(oldest.getUTCFullYear(), oldest.getUTCMonth(), 1)
    : new Date(from.getFullYear(), from.getMonth(), 1);

  const progress = await getTopicProgress(childId);
  const progressBy = new Map(progress.map((p) => [p.topic, p]));

  let made = 0;
  for (let m = new Date(started); m < thisMonth; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const ym = YM(m);
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);

    /**
     * 🔴 **이미 있어도 다시 센다.** 주기가 끝난 뒤 승인된 실천(`BACKFILLED`)은
     *    **그 주기에 귀속**되므로, 한 번 만들고 끝내면 **소급 승인이 숲에 영영 안 들어간다.**
     *
     *    「주기 종료 후 승인된 실천 → 주기 N 에 귀속하고 N+1 나무에 가산하지 않으며
     *    **월간 숲 스냅샷에만 반영**」이 요구다 (`FR-030` 예외). 그 반영이 여기다.
     *
     *    지난 실천은 **늘어나기만 한다**(승인은 되돌려도 실천 기록이 남는다) —
     *    그래서 다시 세도 숫자가 줄지 않는다.
     */
    const exists = await prisma.forestSnapshot.findUnique({
      where: { childId_yearMonth: { childId, yearMonth: ym } },
      select: { id: true, starsEarned: true },
    });

    // 그 주기에 인정된 실천만 센다 — 주기 귀속은 `cycleId` 가 갖고 있다
    const practices = await prisma.practiceCredit.groupBy({
      by: ["topic"], where: { childId, cycleId: cycleIdOf(m) }, _count: { _all: true },
    });
    const practiceBy = new Map(
      practices.filter((x) => x.topic !== null).map((x) => [x.topic as Topic, x._count._all]),
    );

    const [stars, spend, saved, topUp] = await Promise.all([
      prisma.starLedgerEntry.aggregate({
        where: { childId, createdAt: { gte: m, lt: next }, delta: { gt: 0 } }, _sum: { delta: true },
      }),
      // 그 달 소비 합계 — 「잘 쓰기」의 실제 숫자다
      prisma.spendingRecord.aggregate({
        where: { childId, occurredAt: { gte: m, lt: next } }, _sum: { actualAmount: true },
      }),
      // 그 달 목표에 넣은 돈 — 저축률의 분자
      prisma.allowanceEntry.aggregate({
        where: { childId, code: "WISH_SET_ASIDE", createdAt: { gte: m, lt: next } }, _sum: { delta: true },
      }),
      // 그 달 받은 용돈 — 저축률의 분모
      prisma.allowanceEntry.aggregate({
        where: { childId, code: "TOPUP", createdAt: { gte: m, lt: next } }, _sum: { delta: true },
      }),
    ]);

    /**
     * 🔴 **그 달의 학습·실천·소비를 스냅샷에 담는다** (`REQ-FUNC-009`).
     *
     *    담지 않으면 전월 비교가 **나무 단계와 별 두 가지**뿐이다. 단계는 한 달에 잘 안
     *    바뀌므로 리포트가 대개 **비어 있었다** — 요구는 「변화 항목 **7개 이상**」이다.
     *
     * 🔴 **학습·퀴즈는 누적값이다.** `learning_progress` 에 주기 구분이 없어
     *    「그 달의 값」을 되돌릴 수 없다. **찍는 시점의 누적**을 담고,
     *    비교는 **누적의 차이**로 낸다 — 그것이 그 달에 늘어난 양이다.
     *    그래서 **이번 달부터 담기 시작하면 다음 달에 첫 비교가 나온다.** 과거는 소급 안 된다.
     */
    const learnTotal = progress.reduce((n, x) => n + x.completed, 0);
    const quizTotal = progress.reduce((n, x) => n + x.quizCorrect, 0);
    const practiceTotal = [...practiceBy.values()].reduce((n, x) => n + x, 0);
    const setAside = Math.abs(saved._sum.delta ?? 0);
    const got = topUp._sum.delta ?? 0;

    const metrics = {
      learn: learnTotal,
      quiz: quizTotal,
      practice: practiceTotal,
      spentWon: spend._sum.actualAmount ?? 0,
      // 🔴 받은 돈이 0이면 저축률을 0%로 쓰지 않는다 — 나눌 것이 없다
      savingRate: got > 0 ? Math.round((setAside / got) * 100) : null,
    };

    /**
     * 🔴 **학습·퀴즈는 지금 값을 쓴다.** 주기별 학습 기록이 없어서다 —
     *    `learning_progress` 는 누적이고 시점을 되돌릴 수 없다.
     *    지난달 스냅샷의 학습 수가 실제보다 높게 잡힐 수 있다. 알고 남긴다.
     */
    const finalStages = ORDER.map((topic) => {
      const pr = progressBy.get(topic);
      const stage = stageFor(topic, pr?.completed ?? 0, pr?.quizCorrect ?? 0, practiceBy.get(topic) ?? 0);
      return { topic, label: TOPIC_LABEL[topic], stage };
    });

    // 🔴 `upsert` 다. 소급 승인이 들어오면 그 달 스냅샷을 **다시 계산해 덮어쓴다**
    await prisma.forestSnapshot.upsert({
      where: { childId_yearMonth: { childId, yearMonth: ym } },
      create: {
        childId, yearMonth: ym,
        finalStages,
        // 🔴 `deltaItems` 에 **그 달 값**을 담는다. 델타 자체는 읽을 때 앞 달과 견줘 만든다 —
        //    계산 결과를 저장하면 두 곳을 맞춰야 하고, 한쪽만 고쳐지면 숫자가 갈린다
        deltaItems: metrics,
        starsEarned: stars._sum.delta ?? 0,
      },
      update: { finalStages, deltaItems: metrics, starsEarned: stars._sum.delta ?? 0 },
    });
    if (!exists) made++;
  }

  // 🔴 주기가 안 바뀌었으면 나무를 비우지 않는다. 스냅샷만 다시 센 것이다
  if (!rolled) return made;

  // 🔴 실천만 비운다. 단계는 읽는 시점에 계산하므로 저장값도 0으로 되돌린다
  await prisma.treeState.updateMany({
    where: { childId },
    data: { stage: 0, practiceCount: 0, stallDays: 0, cycleStartedAt: utcMonthStart(now) },
  });

  return made;
}
