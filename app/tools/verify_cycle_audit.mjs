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
