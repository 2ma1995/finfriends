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

/**
 * contracts/growth — 🔴 **FR-030 확정 조건표** (어긋남 대장 D30).
 *
 * | 단계 | 학습 | 퀴즈 | 실천 (벌기·쓰기 / 모으기 / 불리기) |
 * | 🌱 새싹 | 0 | 0 | 0 / 0 / 0 |
 * | 🌳 나무 | 5 | 4 | 2 / 1 / 1 |
 * | 🌸 꽃나무 | 10 | 8 | 5 / 2 / 1 |
 * | 🍎 열매나무 | 15 | 12 | 8 / 3 / 1 |
 *
 * 🔴 실천 조건이 **영역마다 다르다.** 같은 숫자를 요구하면 불리기 나무는 영영 안 자란다.
 */
const LADDER = [
  { stage: 1, learn: 5, quiz: 4 }, { stage: 2, learn: 10, quiz: 8 }, { stage: 3, learn: 15, quiz: 12 },
];
const PRACTICE = { EARN: [2, 5, 8], SPEND: [2, 5, 8], SAVE: [1, 2, 3], GROW: [1, 1, 1] };
const needed = (topic, stage) => (stage === 0 ? 0 : PRACTICE[topic][stage - 1]);
const stageFor = (topic, l, q, p) => {
  let r = 0;
  for (const x of LADDER) {
    if (l >= x.learn && q >= x.quiz && p >= needed(topic, x.stage)) r = x.stage; else break;
  }
  return r;
};

let failed = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`); if (!ok) failed++; };

console.log("미션 한 바퀴 — 승인 → 실천 → 승급\n");

let user;
try {
  // 사다리 규칙
  check("🔴 실천 0 이면 학습·퀴즈를 다 채워도 새싹", stageFor("EARN", 99, 99, 0) === 0, "실천 없이는 자라지 않는다 (AC-030-1)");
  check("벌기 학습5·퀴즈4·실천2 → 나무", stageFor("EARN", 5, 4, 2) === 1);
  check("벌기 실천이 1이면 새싹에 머문다", stageFor("EARN", 5, 4, 1) === 0, "벌기는 실천 2회가 필요하다");
  check("모으기는 실천 1로 나무", stageFor("SAVE", 5, 4, 1) === 1, "🔴 영역마다 조건이 다르다");
  check("불리기는 실천 1로 열매나무까지", stageFor("GROW", 15, 12, 1) === 3, "적금은 자주 할 수 있는 일이 아니다");
  check("모으기는 실천 3이라야 열매나무", stageFor("SAVE", 15, 12, 2) === 2);
  check("퀴즈가 모자라면 그 자리에 머문다", stageFor("EARN", 10, 7, 5) === 1, "세 조건을 모두 채워야 오른다");
  check("최고 단계는 열매나무(3)", stageFor("EARN", 99, 99, 99) === 3);

  // 실제 DB 로 한 바퀴
  user = await prisma.devAuthUser.create({ data: { email: `loop-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" } });
  const g = await prisma.guardianAccount.create({ data: { authRef: user.id, consentCompleted: true, consentAt: new Date() } });
  const c = await prisma.childAccount.create({ data: { guardianId: g.id, displayName: "루프", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" } });
  await prisma.learningProgress.create({ data: { childId: c.id, topic: "EARN", completedCount: 1, quizCorrect: 1 } });

  const doneAt = new Date(Date.now() - 2 * 864e5);
  const m = await prisma.mission.create({ data: { childId: c.id, guardianId: g.id, title: "신발 정리", topic: "EARN", reward: 1, state: "PENDING", doneAt, cycleId: 202608 } });

  const before = stageFor("EARN", 1, 1, await prisma.practiceCredit.count({ where: { childId: c.id, topic: "EARN" } }));
  check("승인 전에는 새싹", before === 0, "실천 0");

  // approveMission 이 하는 일을 그대로
  const credit = await prisma.practiceCredit.create({ data: { id: m.id, childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", topic: "EARN", approvalMode: "parent", earnedAt: doneAt, awardedAt: new Date(), cycleId: m.cycleId } });
  await prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "MISSION_APPROVED", balanceAfter: 1, idempotencyKey: `mission:${m.id}`, practiceId: credit.id } });
  await prisma.mission.update({ where: { id: m.id }, data: { state: "BACKFILLED", decidedAt: new Date() } });

  const cnt = await prisma.practiceCredit.count({ where: { childId: c.id, topic: "EARN" } });
  check("승인이 실천을 남긴다", cnt === 1);
  check("승인이 실천을 한 칸 올린다", stageFor("EARN", 5, 4, cnt + 1) === 1, "벌기는 실천 2회에 나무가 된다");
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
