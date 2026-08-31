/**
 * 개발용 시드 — 🔴 로컬 전용. 운영에 돌리지 않는다.
 *
 * 보호자 1 · 아이 1 · 아이 기기 1 · 별 원장 몇 줄을 만든다.
 * 인증(CON-001)이 아직 없어서 **기기 토큰이 유일한 진입 열쇠**다 — 마지막에 출력한다.
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const h = (t) => createHash("sha256").update(t).digest("hex");

await prisma.deviceSession.deleteMany({});
await prisma.starLedgerEntry.deleteMany({});
await prisma.treeState.deleteMany({});
await prisma.childAccount.deleteMany({});
await prisma.guardianAccount.deleteMany({});

const g = await prisma.guardianAccount.create({
  data: { authRef: "dev-guardian", consentCompleted: true, consentAt: new Date(), childModePinHash: h("1234") },
});
const c = await prisma.childAccount.create({
  data: { guardianId: g.id, displayName: "서연", birthYear: 2017, state: "ACTIVE" },
});
await prisma.treeState.createMany({
  data: ["EARN", "SPEND", "SAVE", "GROW"].map((slot) => ({ childId: c.id, slot, cycleStartedAt: new Date() })),
});

// 별 원장 — 아이 화면이 그대로 읽는다
const day = (n) => new Date(Date.now() - n * 864e5);
const rows = [
  ["SPENDING_RETRO", +1, 1], ["MISSION_APPROVED", +1, 2], ["WARDROBE_SPEND", -5, 3],
  ["QUIZ_CORRECT", +1, 4], ["MISSION_APPROVED", +2, 5], ["ATTENDANCE", +1, 6],
  ["ONBOARDING_LEARN", +1, 7], ["WISHLIST_REACHED", +1, 8], ["QUIZ_CORRECT", +1, 9],
  ["MISSION_APPROVED", +1, 10], ["ATTENDANCE", +1, 11], ["QUIZ_CORRECT", +1, 12],
];
let bal = 0;
for (const [code, delta, ago] of rows.slice().reverse()) {
  bal += delta;
  await prisma.starLedgerEntry.create({
    data: { childId: c.id, delta, triggerCode: code, balanceAfter: bal,
            idempotencyKey: `seed-${code}-${ago}`, createdAt: day(ago) },
  });
}

// 학습 진도 — LRN-001
await prisma.learningProgress.deleteMany({});
await prisma.learningProgress.createMany({ data: [
  { childId: c.id, topic: "EARN",  completedCount: 3, quizCorrect: 5 },
  { childId: c.id, topic: "SPEND", completedCount: 2, quizCorrect: 4 },
  { childId: c.id, topic: "SAVE",  completedCount: 1, quizCorrect: 2 },
] });

// 위시리스트 — PRC-004. reachedSteps 는 이미 별을 받은 단계다
await prisma.wishlist.deleteMany({});
await prisma.wishlist.createMany({ data: [
  { childId: c.id, name: "물감 세트", targetAmount: 24000, savedAmount: 18000, rank: 1, reachedSteps: [30, 70] },
  { childId: c.id, name: "만화책",   targetAmount: 12000, savedAmount: 4000,  rank: 2, reachedSteps: [30] },
  { childId: c.id, name: "축구공",   targetAmount: 30000, savedAmount: 3000,  rank: 3, reachedSteps: [] },
] });

const token = randomBytes(32).toString("base64url");
await prisma.deviceSession.create({
  data: { guardianId: g.id, childId: c.id, deviceRef: randomBytes(12).toString("hex"),
          mode: "CHILD", tokenHash: h(token), expiresAt: new Date(Date.now() + 180 * 864e5) },
});

console.log("  보호자   ", g.id);
console.log("  아이     ", c.id, c.displayName);
console.log("  별 잔액  ", bal);
console.log("  해제 PIN  1234");
console.log("");
console.log("  기기 토큰 (브라우저 콘솔에 붙여넣기):");
console.log(`  document.cookie="ff_device_token=${token}; path=/"; document.cookie="ff_device=CHILD; path=/"`);
await prisma.$disconnect();
