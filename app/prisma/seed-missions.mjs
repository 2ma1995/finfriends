/**
 * 미션만 다시 까는 개발용 도구 — PRC-001.
 *
 * 🔴 **아무것도 지우지 않는다.** `seed.mjs` 는 보호자·아이·인증을 전부 비우는데,
 *    이 DB 는 다른 작업자와 공유한다. 남의 로그인 계정을 날리지 않으려고 따로 뒀다.
 *
 * 🔴 activity 는 identity 로 FK 를 걸 수 없다(REQ-NF-009 결합 조회 차단).
 *    그래서 아이를 다시 만들면 미션이 **고아**로 남는다 — 실제로 한 번 그렇게 됐다.
 *    여기서 지금 아이에게 다시 붙인다.
 *
 * 사용: node prisma/seed-missions.mjs [아이이름] [--demo]
 *   기본     오늘 시작한 아이 — 미션 3건 전부 「안 함」. **지난 기록이 없다.**
 *            별 원장·온보딩도 비운다. 처음 쓰는 아이한테 지난 미션이 있으면 안 된다.
 *   --demo   화면 확인용 — 네 가지 상태(대기·승인·소급·거절)를 전부 깐다
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const h = (t) => createHash("sha256").update(t).digest("hex");
const day = (n) => new Date(Date.now() - n * 864e5);

const want = process.argv[2];
const kids = await prisma.childAccount.findMany({
  select: { id: true, guardianId: true, displayName: true },
  orderBy: { createdAt: "asc" },
});
if (kids.length === 0) {
  console.error("아이가 없다. 먼저 `node prisma/seed.mjs` 를 돌린다.");
  process.exit(1);
}
const c = (want && kids.find((k) => k.displayName === want)) || kids[0];
if (kids.length > 1) console.log("  아이 후보:", kids.map((k) => k.displayName).join(" · "), "→ 선택:", c.displayName);

const demo = process.argv.includes("--demo");

// 이 아이 것만 지운다. 다른 아이 미션은 건드리지 않는다
await prisma.mission.deleteMany({ where: { childId: c.id } });
const cyc = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

// 오늘 받은 미션 — 어느 쪽이든 이 셋은 「안 함」으로 시작한다
const fresh = [
  { title: "장 볼 때 가격표 두 개 비교하기", topic: "SPEND", reward: 2 },
  { title: "용돈 기입장 오늘 치 적기",       topic: "SAVE",  reward: 1 },
  { title: "안 쓰는 물건 하나 정리해 팔기",   topic: "EARN",  reward: 3 },
];

// 🔴 지난 기록은 **--demo 일 때만**. 오늘 시작한 아이한테 지난 미션이 있으면
//    「내가 안 한 걸 했다고 되어 있다」가 된다. 시드가 화면을 거짓말시키면 안 된다.
const history = !demo ? [] : [
  { title: "간식 사기 전에 잠깐 참아 보기", topic: "SPEND", reward: 2, doneAt: day(1), cycleId: cyc },
  { title: "저금통에 1000원 넣기",        topic: "SAVE",  reward: 1,
    state: "APPROVED",   doneAt: day(4), decidedAt: day(3), cycleId: cyc },
  { title: "심부름 하고 받은 돈 기록하기", topic: "EARN",  reward: 2,
    state: "BACKFILLED", doneAt: day(9), decidedAt: day(2), cycleId: cyc },
  { title: "일주일 동안 군것질 안 하기",   topic: "SPEND", reward: 3,
    state: "REJECTED",   doneAt: day(6), decidedAt: day(5), cycleId: cyc,
    rejectReason: "이틀은 사 먹었어요. 다음 주에 다시 해봐요" },
];

await prisma.mission.createMany({
  data: [...fresh, ...history].map((m) => ({ ...m, childId: c.id, guardianId: c.guardianId })),
});

// 기본 모드는 **오늘이 첫날**이다. 별도 온보딩도 처음으로 돌린다 —
// 「지금 네 별은 9개야」를 처음 켠 아이한테 말하면 그것도 거짓말이다
if (!demo) {
  await prisma.starLedgerEntry.deleteMany({ where: { childId: c.id } });
  await prisma.childOnboarding.deleteMany({ where: { childId: c.id } });
  // 🔴 산 물건도 같이 비운다. 별만 0으로 돌리면 **별 없이 고양이를 가진 아이**가 된다 —
  //    원장과 보유가 서로 안 맞는 상태를 시드가 만들어 내면 안 된다
  await prisma.childItem.deleteMany({ where: { childId: c.id } });
  await prisma.childRoom.deleteMany({ where: { childId: c.id } });
  // 🔴 학습 진도도 비운다. 안 그러면 오늘 시작한 아이가 「3 / 3편 다 봤어요」로 시작한다
  await prisma.learningProgress.deleteMany({ where: { childId: c.id } });
}

// 이 아이로 들어갈 기기 토큰을 새로 발급한다 (기존 것은 그대로 둔다)
const token = randomBytes(32).toString("base64url");
await prisma.deviceSession.create({
  data: { guardianId: c.guardianId, childId: c.id, deviceRef: randomBytes(12).toString("hex"),
          mode: "CHILD", tokenHash: h(token), expiresAt: new Date(Date.now() + 180 * 864e5) },
});

const g = await prisma.guardianAccount.findUnique({
  where: { id: c.guardianId }, select: { consentCompleted: true },
});
console.log("  아이      ", c.displayName, c.id);
console.log("  모드      ", demo ? "--demo · 네 가지 상태 전부" : "첫날 · 지난 기록 없음");
console.log("  미션      ", await prisma.mission.count({ where: { childId: c.id } }), "건",
            demo ? "(안 함 3 · 대기 1 · 승인 1 · 소급 1 · 거절 1)" : "(전부 안 함)");
if (!demo) console.log("  별        0개 · 가진 아이템 없음 · 온보딩 처음부터");
if (!g?.consentCompleted) console.log("  ⚠ 보호자 동의가 아직 없다 — 아이 화면이 「동의가 필요해요」로 막힌다");
console.log("");
console.log("  아이 화면 열기 (브라우저 콘솔에 붙여넣고 새로고침):");
console.log(`  document.cookie="ff_device_token=${token}; path=/"; document.cookie="ff_device=CHILD; path=/"`);
await prisma.$disconnect();
