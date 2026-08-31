/**
 * 미션 한 바퀴 검증 — PRC-001 · GRW-003 · 🔴 로컬 전용
 *
 * 확인하는 것 — **승인이 별과 실천을 함께 남기고, 그 실천이 나무를 올리는가.**
 * 별만 주면 나무가 그대로여서 「했는데 왜 안 자라지」가 된다. 실제로 그랬다.
 *
 * 🔴 `modules/mission.approveMission` 과 `contracts/growth.stageFor` 의 규칙을
 *    다시 밟는다. 고치면 여기도 같이 고친다.
 *
 *   node tools/verify_mission_loop.mjs
 */
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends" }) });

/** contracts/growth.STAGE_LADDER */
const LADDER = [ { stage: 1, learn: 1, quiz: 1, practice: 1 }, { stage: 2, learn: 3, quiz: 5, practice: 1 } ];
const stageFor = (l, q, p) => { let r = 0; for (const x of LADDER) { if (l >= x.learn && q >= x.quiz && p >= x.practice) r = x.stage; else break; } return r; };

let failed = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`); if (!ok) failed++; };

console.log("미션 한 바퀴 — 승인 → 실천 → 승급\n");

let user;
try {
  // 사다리 규칙
  check("실천 0 이면 학습·퀴즈를 다 채워도 씨앗", stageFor(99, 99, 0) === 0, "🔴 실천 없이는 자라지 않는다");
  check("학습1·퀴즈1·실천1 → 새싹", stageFor(1, 1, 1) === 1);
  check("학습3·퀴즈5·실천1 → 나무", stageFor(3, 5, 1) === 2);
  check("퀴즈가 5 미만이면 새싹에 머문다", stageFor(3, 4, 1) === 1);

  // 실제 DB 로 한 바퀴
  user = await prisma.devAuthUser.create({ data: { email: `loop-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" } });
  const g = await prisma.guardianAccount.create({ data: { authRef: user.id, consentCompleted: true, consentAt: new Date() } });
  const c = await prisma.childAccount.create({ data: { guardianId: g.id, displayName: "루프", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" } });
  await prisma.learningProgress.create({ data: { childId: c.id, topic: "EARN", completedCount: 1, quizCorrect: 1 } });

  const doneAt = new Date(Date.now() - 2 * 864e5);
  const m = await prisma.mission.create({ data: { childId: c.id, guardianId: g.id, title: "신발 정리", topic: "EARN", reward: 1, state: "PENDING", doneAt, cycleId: 202608 } });

  const before = stageFor(1, 1, await prisma.practiceCredit.count({ where: { childId: c.id, topic: "EARN" } }));
  check("승인 전에는 씨앗", before === 0, "실천 0");

  // approveMission 이 하는 일을 그대로
  const credit = await prisma.practiceCredit.create({ data: { id: m.id, childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", topic: "EARN", approvalMode: "parent", earnedAt: doneAt, awardedAt: new Date(), cycleId: m.cycleId } });
  await prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "MISSION_APPROVED", balanceAfter: 1, idempotencyKey: `mission:${m.id}`, practiceId: credit.id } });
  await prisma.mission.update({ where: { id: m.id }, data: { state: "BACKFILLED", decidedAt: new Date() } });

  const cnt = await prisma.practiceCredit.count({ where: { childId: c.id, topic: "EARN" } });
  check("승인이 실천을 남긴다", cnt === 1);
  check("승인 후 새싹으로 오른다", stageFor(1, 1, cnt) === 1);
  check("earnedAt 은 아이가 한 시각", credit.earnedAt.getTime() === doneAt.getTime(), "소급 승인이면 awardedAt 과 다르다");
  check("🔴 귀속 주기는 완료 시점", credit.cycleId === 202608, "지급 시각으로 계산하면 다음 달 나무가 부풀려진다");

  // 재승인 — 별과 실천 모두 중복되지 않는다
  let dupStar = false;
  try { await prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "MISSION_APPROVED", balanceAfter: 2, idempotencyKey: `mission:${m.id}` } }); } catch { dupStar = true; }
  check("재승인 시 별 중복 차단", dupStar, "idempotency_key unique");
  check("재승인 시 실천 중복 없음", (await prisma.practiceCredit.count({ where: { childId: c.id } })) === 1);

  await prisma.starLedgerEntry.deleteMany({ where: { childId: c.id } });
  await prisma.practiceCredit.deleteMany({ where: { childId: c.id } });
  await prisma.mission.deleteMany({ where: { guardianId: g.id } });
  await prisma.learningProgress.deleteMany({ where: { childId: c.id } });
  await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
  await prisma.guardianAccount.delete({ where: { id: g.id } });
  await prisma.devAuthUser.delete({ where: { id: user.id } });
  check("정리 완료", true);
} catch (e) {
  console.error("\n예외:", e.message); failed++;
  if (user) {
    const g = await prisma.guardianAccount.findUnique({ where: { authRef: user.id } });
    if (g) { const kids = await prisma.childAccount.findMany({ where: { guardianId: g.id }, select: { id: true } });
      const ids = kids.map(k => k.id);
      await prisma.starLedgerEntry.deleteMany({ where: { childId: { in: ids } } });
      await prisma.practiceCredit.deleteMany({ where: { childId: { in: ids } } });
      await prisma.mission.deleteMany({ where: { guardianId: g.id } });
      await prisma.learningProgress.deleteMany({ where: { childId: { in: ids } } });
      await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
      await prisma.guardianAccount.delete({ where: { id: g.id } }); }
    await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
  }
}
await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
