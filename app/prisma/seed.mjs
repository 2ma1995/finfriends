/**
 * 개발용 시드 — 🔴 로컬 전용. 운영에 돌리지 않는다.
 *
 * 시드 보호자(`dev-guardian`) 1 · 아이 1 · 아이 기기 1 · 별 원장 몇 줄을 만든다.
 *
 * 🔴 **사람이 가입한 계정은 건드리지 않는다.** 범위는 `dev-guardian` 과 그 아이들뿐이다.
 *    이 시드 보호자는 인증 사용자를 갖지 않으므로 기기 토큰으로만 아이 화면에 들어간다 —
 *    부모 화면을 보려면 화면에서 직접 가입해 로그인한다(CON-001).
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * 🔴 **어느 DB 를 보는지 첫 줄에 찍는다** (어긋남 대장 D64).
 *
 * 이 파일들은 `process.env.DATABASE_URL ?? "localhost:55432"` 였다.
 * `.mjs` 는 `dotenv` 를 스스로 안 읽으므로 **그 값이 늘 비어 있었고**,
 * `.env` 가 Supabase 를 가리키게 바뀐 뒤에도 **조용히 로컬 도커를 봤다.**
 *
 * 앱은 Supabase 를 보는데 도구는 로컬을 보고 있었다 — 「아이 목록」이 다르게 나와도
 * **아무도 이유를 몰랐다.** 조용한 기본값이 원인이다.
 */
function dbUrl() {
  const u = process.env.DATABASE_URL;
  if (!u) {
    console.error("🔴 DATABASE_URL 이 없다. app/.env 를 채운다 — 조용히 로컬로 떨어지지 않는다");
    process.exit(1);
  }
  console.log(`  (대상 DB: ${new URL(u).hostname})`);
  return u;
}


const url = dbUrl();

// 🔴 로컬만. 운영 접속 문자열로 이 스크립트가 도는 사고를 구조로 막는다
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("로컬 DB 가 아니다. 시드를 돌리지 않는다:", url.replace(/:[^:@]*@/, ":***@"));
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const h = (t) => createHash("sha256").update(t).digest("hex");

const SEED_AUTH_REF = "dev-guardian";

/**
 * 🔴 **자기가 만든 것만 지운다.**
 *
 * 처음에는 `deleteMany({})` 로 전부 비웠다. 그러면 사람이 화면에서 가입해 둔 계정이
 * 시드를 돌릴 때마다 사라진다 — 실제로 두 번 그렇게 됐다.
 * 한 번은 `guardian_accounts` 만 지워서 **비밀번호는 맞는데 로그인만 실패**하는 상태가 됐고,
 * 인증까지 함께 지우도록 고쳤더니 이번에는 계정이 통째로 없어졌다.
 *
 * 시드 데이터와 사람이 만든 데이터가 **같은 DB 에 공존**하는 것이 전제다.
 * 그러니 범위를 `dev-guardian` 과 그 아이들로 좁힌다. `dev_auth` 는 건드리지 않는다 —
 * 시드 보호자는 애초에 인증 사용자를 갖지 않는다(기기 토큰으로만 들어간다).
 */
const prev = await prisma.guardianAccount.findUnique({
  where: { authRef: SEED_AUTH_REF },
  select: { id: true, children: { select: { id: true } } },
});

if (prev) {
  const childIds = prev.children.map((c) => c.id);
  const byChild = { childId: { in: childIds } };
  await prisma.deviceSession.deleteMany({ where: { guardianId: prev.id } });
  await prisma.mission.deleteMany({ where: { guardianId: prev.id } });
  await prisma.starLedgerEntry.deleteMany({ where: byChild });
  await prisma.treeState.deleteMany({ where: byChild });
  await prisma.learningProgress.deleteMany({ where: byChild });
  await prisma.wishlist.deleteMany({ where: byChild });
  await prisma.childAccount.deleteMany({ where: { guardianId: prev.id } });
  await prisma.guardianAccount.delete({ where: { id: prev.id } });
  console.log("  이전 시드 데이터 정리 · 아이", childIds.length, "명");
}

const g = await prisma.guardianAccount.create({
  data: { authRef: "dev-guardian", consentCompleted: true, consentAt: new Date(), childModePinHash: h("1234") },
});
/**
 * 🔴 **이름이 「(시드)테스트」다.** 전에는 「서연」이었다.
 *
 *    사람 이름을 쓰니 실제 가입 계정과 구별이 안 됐다 — 사용자가 두 번 물었다
 *    (「서연이가 누구야」 · 「서연은 없어도 되는 거 아니야」).
 *    보고서에도 화면에도 섞여 나오는데, **로그인할 수 없는 계정**이다
 *    (`dev-guardian` 은 이메일도 비밀번호도 없다).
 *
 *    이름 앞에 「(시드)」를 붙이면 **어디서 보든 가짜인 줄 안다.**
 */
const c = await prisma.childAccount.create({
  data: { guardianId: g.id, displayName: "(시드)테스트", birthYear: 2017, state: "ACTIVE" },
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
await prisma.learningProgress.createMany({ data: [
  { childId: c.id, topic: "EARN",  completedCount: 3, quizCorrect: 5 },
  { childId: c.id, topic: "SPEND", completedCount: 2, quizCorrect: 4 },
  { childId: c.id, topic: "SAVE",  completedCount: 1, quizCorrect: 2 },
] });

// 위시리스트 — PRC-004. reachedSteps 는 이미 별을 받은 단계다
await prisma.wishlist.createMany({ data: [
  { childId: c.id, name: "물감 세트", targetAmount: 24000, savedAmount: 18000, rank: 1, reachedSteps: [30, 70] },
  { childId: c.id, name: "만화책",   targetAmount: 12000, savedAmount: 4000,  rank: 2, reachedSteps: [30] },
  { childId: c.id, name: "축구공",   targetAmount: 30000, savedAmount: 3000,  rank: 3, reachedSteps: [] },
] });

// 미션 — PRC-001. 🔴 **오늘 시작한 아이**를 만든다.
//    지난 기록(승인·소급·거절)을 깔면 아이가 **자기가 안 한 걸 했다고 되어 있는** 화면을 본다.
//    네 가지 상태를 다 보려면 `node prisma/seed-missions.mjs <이름> --demo` 를 쓴다.
await prisma.mission.createMany({ data: [
  { childId: c.id, guardianId: g.id, title: "장 볼 때 가격표 두 개 비교하기", topic: "SPEND", reward: 2 },
  { childId: c.id, guardianId: g.id, title: "용돈 기입장 오늘 치 적기",       topic: "SAVE",  reward: 1 },
  { childId: c.id, guardianId: g.id, title: "안 쓰는 물건 하나 정리해 팔기",   topic: "EARN",  reward: 3 },
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
console.log("  아이 화면 열기 — 이 주소를 브라우저에 붙여넣으면 됩니다:");
console.log(`  http://localhost:${process.env.PORT ?? 4600}/child/enter?t=${token}`);
await prisma.$disconnect();
