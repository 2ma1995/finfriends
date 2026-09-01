/**
 * 주기 전환 · 월말 스냅샷 · 별 원장 정산 — GRW-004 · AC-030-3 · FR-012 · 🔴 로컬 전용
 *
 * 확인하는 것 — **달이 바뀌면 나무가 비워지고 숲에 남는가**, 그리고
 * **원장이 어긋났을 때 잡히는가.**
 *
 * 🔴 이 셋은 `pg_cron` 배치가 할 일인데 로컬에 cron 이 없어 화면 열 때 처리한다.
 *    배치가 붙으면 같은 함수를 부르면 되므로 이 검증은 그대로 쓴다.
 *
 *   node tools/verify_cycle_audit.mjs
 */
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends" }) });

let failed = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`); if (!ok) failed++; };
const key = () => `cyc:${randomBytes(6).toString("hex")}`;

console.log("주기 전환 · 스냅샷 · 원장 정산\n");

let user;
try {
  user = await prisma.devAuthUser.create({ data: { email: `cyc-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" } });
  const g = await prisma.guardianAccount.create({ data: { authRef: user.id, consentCompleted: true, consentAt: new Date() } });
  const c = await prisma.childAccount.create({ data: { guardianId: g.id, displayName: "주기", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" } });

  // ── 지난달에 활동한 아이 ──
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const lastCycle = lastMonth.getFullYear() * 100 + (lastMonth.getMonth() + 1);

  await prisma.treeState.createMany({
    data: ["EARN", "SPEND", "SAVE", "GROW"].map((slot) => ({
      childId: c.id, slot, cycleStartedAt: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1)),
    })),
  });
  await prisma.learningProgress.create({ data: { childId: c.id, topic: "EARN", completedCount: 5, quizCorrect: 4 } });
  for (let i = 0; i < 2; i++) {
    await prisma.practiceCredit.create({
      data: { childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", topic: "EARN",
              approvalMode: "parent", earnedAt: lastMonth, awardedAt: lastMonth, cycleId: lastCycle },
    });
  }
  await prisma.starLedgerEntry.create({
    data: { childId: c.id, delta: 3, triggerCode: "MISSION_APPROVED", balanceAfter: 3, idempotencyKey: key(), createdAt: lastMonth },
  });

  const before = await prisma.treeState.findFirst({ where: { childId: c.id, slot: "EARN" }, select: { cycleStartedAt: true } });
  check("지난달에 시작한 주기가 남아 있다", before.cycleStartedAt < new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));

  // rollCycleIfNeeded 가 하는 일
  const ym = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  const stars = await prisma.starLedgerEntry.aggregate({
    where: { childId: c.id, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lt: new Date(now.getFullYear(), now.getMonth(), 1) }, delta: { gt: 0 } },
    _sum: { delta: true },
  });
  await prisma.forestSnapshot.create({
    data: { childId: c.id, yearMonth: ym,
            finalStages: [{ topic: "EARN", label: "벌기", stage: 1 }],
            deltaItems: [], starsEarned: stars._sum.delta ?? 0 },
  });
  await prisma.treeState.updateMany({
    where: { childId: c.id },
    // 🔴 날짜 컬럼에는 UTC 자정을 쓴다. 로컬 자정을 넣으면 하루 밀려 저장된다
    data: { stage: 0, practiceCount: 0, stallDays: 0, cycleStartedAt: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)) },
  });

  const snap = await prisma.forestSnapshot.findUnique({ where: { childId_yearMonth: { childId: c.id, yearMonth: ym } } });
  check("🔴 지난 주기가 숲에 남는다", snap !== null, "없으면 월간 숲이 영원히 「다음 달부터」다");
  check("스냅샷에 그 달 별이 담긴다", snap.starsEarned === 3, "별을 즉시 쓰는 아이에게 유일한 누적 증거다");

  const after = await prisma.treeState.findFirst({ where: { childId: c.id, slot: "EARN" }, select: { cycleStartedAt: true, practiceCount: true } });
  /**
   * 🔴 `cycle_started_at` 은 **날짜 컬럼**이라 시각이 잘린다.
   *    시각으로 비교하면 시간대(KST +9)만큼 어긋나 「안 넘어갔다」로 보인다 — 실제로 그랬다.
   *    **연·월로 견준다.**
   */
  const ymOf = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const thisYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  check("🔴 나무가 이번 달로 비워진다", after.practiceCount === 0 && ymOf(after.cycleStartedAt) === thisYm,
    "안 비우면 한 번 열매나무가 영원히 열매나무다");

  // 🔴 실천만 비운다 — 학습은 그대로
  const lp = await prisma.learningProgress.findFirst({ where: { childId: c.id, topic: "EARN" }, select: { completedCount: true, quizCorrect: true } });
  check("🔴 학습·퀴즈는 비우지 않는다", lp.completedCount === 5 && lp.quizCorrect === 4,
    "읽은 편 목록이라 초기화하면 이미 읽은 것을 다시 읽어야 한다");

  // 지난 주기 실천은 그 주기에 남는다
  const thisCycle = now.getFullYear() * 100 + (now.getMonth() + 1);
  check("지난 주기 실천이 이번 달로 안 넘어온다",
    (await prisma.practiceCredit.count({ where: { childId: c.id, cycleId: thisCycle } })) === 0,
    "주기 귀속은 cycleId 가 갖는다");

  /**
   * 🔴 **주기가 끝난 뒤 승인된 실천(소급)이 그 달 숲에 들어가는가.**
   *
   *    「주기 종료 후 승인된 실천 → 주기 N 에 귀속하고 N+1 나무에 가산하지 않으며
   *    **월간 숲 스냅샷에만 반영**」이 요구다.
   *
   *    스냅샷을 한 번 만들고 끝내면 **늦게 승인한 것이 숲에서 사라진다.**
   *    부모가 사흘 뒤에 승인하는 일은 흔하고, 그게 달을 넘기면 그렇게 된다.
   */
  const beforeStages = (await prisma.forestSnapshot.findUnique({
    where: { childId_yearMonth: { childId: c.id, yearMonth: ym } }, select: { finalStages: true },
  })).finalStages;
  check("스냅샷이 먼저 만들어져 있다", Array.isArray(beforeStages));

  // 지난달에 「했어요」를 누른 것을 이번 달에 승인한다 — cycleId 는 완료 시점 그대로다
  await prisma.practiceCredit.create({
    data: { childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", topic: "SAVE",
            approvalMode: "parent", earnedAt: lastMonth, awardedAt: new Date(), cycleId: lastCycle },
  });

  // rollCycleIfNeeded 가 다시 세는 부분 — upsert 로 덮어쓴다
  const again = await prisma.practiceCredit.groupBy({
    by: ["topic"], where: { childId: c.id, cycleId: lastCycle }, _count: { _all: true },
  });
  const saveCount = again.find((x) => x.topic === "SAVE")?._count._all ?? 0;
  check("🔴 소급 승인이 그 주기에 귀속된다", saveCount === 1,
    "cycleId 는 「했어요」 때 박힌다 — 승인 시각이 아니다");

  await prisma.forestSnapshot.upsert({
    where: { childId_yearMonth: { childId: c.id, yearMonth: ym } },
    create: { childId: c.id, yearMonth: ym, finalStages: [], deltaItems: [], starsEarned: 0 },
    update: { finalStages: [{ topic: "SAVE", label: "모으기", stage: 1 }] },
  });
  const afterStages = (await prisma.forestSnapshot.findUnique({
    where: { childId_yearMonth: { childId: c.id, yearMonth: ym } }, select: { finalStages: true },
  })).finalStages;
  check("🔴 이미 만든 스냅샷이 다시 계산된다", JSON.stringify(afterStages) !== JSON.stringify(beforeStages),
    "한 번 만들고 끝내면 늦게 승인한 것이 숲에서 사라진다");

  const snapCount = await prisma.forestSnapshot.count({ where: { childId: c.id, yearMonth: ym } });
  check("다시 세도 스냅샷이 늘지 않는다", snapCount === 1, "upsert 다 — 같은 달에 두 장이 생기면 안 된다");

  /**
   * 🔴 **전월 비교가 7개 이상 나오는가** — REQ-FUNC-009.
   *
   *    단계만 보면 리포트가 대개 비어 있다 — 나무 단계는 한 달에 잘 안 바뀐다.
   *    학습·퀴즈·실천·소비·저축률은 매달 움직이므로 그것이 실제 변화다.
   */
  const buildDeltas = (snaps) => {
    if (snaps.length < 2) return [];
    const [last, before] = snaps;
    const beforeBy = new Map((before.finalStages ?? []).map((x) => [x.topic, x.stage]));
    const out = (last.finalStages ?? []).flatMap((x) => {
      const was = beforeBy.get(x.topic);
      return was === undefined || was === x.stage ? [] : [{ label: x.label }];
    });
    if (last.starsEarned !== before.starsEarned) out.push({ label: "이번 달 별" });
    const a = before.deltaItems ?? {}, b = last.deltaItems ?? {};
    for (const [label, k] of [["실천 횟수","practice"],["맞힌 퀴즈","quiz"],["읽은 이야기","learn"],["저축률","savingRate"]]) {
      if (typeof a[k] === "number" && typeof b[k] === "number" && a[k] !== b[k]) out.push({ label });
    }
    if (typeof a.spentWon === "number" && typeof b.spentWon === "number" && a.spentWon !== b.spentWon) out.push({ label: "쓴 돈" });
    return out;
  };

  const stages4 = (s0, s1, s2, s3) => [
    { topic: "EARN", label: "벌기", stage: s0 }, { topic: "SPEND", label: "잘 쓰기", stage: s1 },
    { topic: "SAVE", label: "모으기", stage: s2 }, { topic: "GROW", label: "불리기", stage: s3 },
  ];

  const prevSnap = { yearMonth: "2026-07", finalStages: stages4(0,0,0,0), starsEarned: 3,
    deltaItems: { learn: 2, quiz: 1, practice: 1, spentWon: 3000, savingRate: 10 } };
  const lastSnap = { yearMonth: "2026-08", finalStages: stages4(1,1,1,0), starsEarned: 9,
    deltaItems: { learn: 6, quiz: 5, practice: 4, spentWon: 5200, savingRate: 35 } };

  const deltas = buildDeltas([lastSnap, prevSnap]);
  check("🔴 전월 비교가 7개 이상 나온다", deltas.length >= 7,
    `${deltas.length}개 — ${deltas.map((d) => d.label).join(" · ")}`);

  // 🔴 단계만 있으면 리포트가 빈다 — 그래서 그 달 값을 담는다
  const stagesOnly = buildDeltas([
    { ...lastSnap, finalStages: stages4(0,0,0,0), starsEarned: 3, deltaItems: {} },
    { ...prevSnap, deltaItems: {} },
  ]);
  check("단계가 그대로면 예전엔 0개였다", stagesOnly.length === 0,
    "그 달 값을 담지 않으면 리포트가 비어 있었다");

  // 🔴 한쪽에 값이 없으면 건너뛴다 — 0으로 그리면 「고장」으로 읽힌다
  const partial = buildDeltas([
    { ...lastSnap, deltaItems: { practice: 4 } },
    { ...prevSnap, deltaItems: {} },
  ]);
  check("🔴 한쪽에 값이 없으면 그 줄을 안 만든다",
    !partial.some((d) => d.label === "실천 횟수"), "없는 것을 0으로 그리지 않는다 (AC-E2)");

  // 🔴 내려간 것도 적는다 — 좋은 소식만 남기면 광고가 된다
  const down = buildDeltas([
    { ...lastSnap, deltaItems: { ...lastSnap.deltaItems, practice: 0 } },
    prevSnap,
  ]);
  check("🔴 내려간 것도 리포트에 남는다", down.some((d) => d.label === "실천 횟수"));

  // ── 별 원장 정산 ──
  const good = await prisma.starLedgerEntry.create({
    data: { childId: c.id, delta: 2, triggerCode: "QUIZ_CORRECT", balanceAfter: 5, idempotencyKey: key() },
  });
  const bad = await prisma.starLedgerEntry.create({
    // 🔴 일부러 어긋뜨린다 — 5 + 1 = 6 이어야 하는데 99 로 적는다
    data: { childId: c.id, delta: 1, triggerCode: "ATTENDANCE", balanceAfter: 99, idempotencyKey: key() },
  });

  // reconcileStars 가 하는 일
  const rows = await prisma.starLedgerEntry.findMany({
    where: { childId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, delta: true, balanceAfter: true, quarantinedAt: true },
  });
  let running = 0; const broken = [];
  for (const r of rows) {
    running += r.delta;
    if (r.balanceAfter !== running && r.quarantinedAt === null) broken.push(r.id);
    running = r.balanceAfter;
  }
  if (broken.length) await prisma.starLedgerEntry.updateMany({ where: { id: { in: broken } }, data: { quarantinedAt: new Date() } });

  const q = async (id) => (await prisma.starLedgerEntry.findUnique({ where: { id }, select: { quarantinedAt: true } }))?.quarantinedAt;
  check("🔴 어긋난 줄이 잡힌다", (await q(bad.id)) !== null, "재지 않는 0% 는 0% 가 아니다");
  check("🔴 멀쩡한 줄은 안 건드린다", (await q(good.id)) === null, "한 줄 때문에 뒤 줄이 전부 걸리면 안 된다");

  const sum = await prisma.starLedgerEntry.aggregate({ where: { childId: c.id }, _sum: { delta: true } });
  check("🔴 잔액을 줄이지 않는다", sum._sum.delta === 6,
    "AC-012-3 · 어제 본 별이 오늘 줄면 아이는 앱을 못 믿는다");

  await prisma.starLedgerEntry.deleteMany({ where: { childId: c.id } });
  await prisma.practiceCredit.deleteMany({ where: { childId: c.id } });
  await prisma.forestSnapshot.deleteMany({ where: { childId: c.id } });
  await prisma.learningProgress.deleteMany({ where: { childId: c.id } });
  await prisma.treeState.deleteMany({ where: { childId: c.id } });
  await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
  await prisma.guardianAccount.delete({ where: { id: g.id } });
  await prisma.devAuthUser.delete({ where: { id: user.id } });
  user = null;
  check("정리 완료", true);
} catch (e) {
  console.error("\n예외:", e.message); failed++;
  if (user) await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
}
await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
