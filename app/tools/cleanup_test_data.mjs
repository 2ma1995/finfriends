/**
 * 검증 스크립트가 남긴 것을 거둔다 — 🔴 로컬 전용.
 *
 * 🔴 **예외 경로에서 정리가 덜 됐다.** `catch` 가 `dev_auth.users` 만 지우고
 *    아이·보호자·활동 기록은 남겼다. 실제로 두 건이 공유 DB 에 쌓였다 —
 *    「루프」(미션 검증)와 「떠남」(탈퇴 검증)이고, **나무·숲 집계에 섞여 들어간다.**
 *
 * 🔴 **사람이 만든 계정은 건드리지 않는다.** 판정 기준은 이메일이 `@example.test` 이거나
 *    보호자가 없는 것이 아니라, **검증 스크립트가 쓰는 이메일 접두사**다.
 *    시드(`dev-guardian`)와 실제 가입 계정은 그 접두사를 갖지 않는다.
 *
 *   npm run db:cleanup        # 미리 보기
 *   npm run db:cleanup --yes  # 실제로 지운다
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends" }) });
const APPLY = process.argv.includes("--yes");

/** 검증 스크립트가 쓰는 이메일 접두사 — 이것만 지운다 */
const PREFIXES = ["loop-", "bye-", "bank-", "cyc-", "lock-", "child-", "consent-", "verify-"];

const users = await prisma.devAuthUser.findMany({
  where: { OR: PREFIXES.map((p) => ({ email: { startsWith: p } })) },
  select: { id: true, email: true },
});

/**
 * 🔴 **고아 보호자도 거둔다.** 탈퇴 검증이 예외로 죽으면 `dev_auth.users` 만 지워지고
 *    보호자·아이는 남는다 — 이메일이 없으니 위 접두사로는 안 잡힌다.
 *    실제로 「떠남」이 그렇게 남아 **나무·숲 집계에 섞여 들어갔다.**
 *
 * 🔴 **`dev-guardian`(시드)은 건드리지 않는다.** 그것도 `dev_auth` 행이 없지만
 *    일부러 그렇게 만든 것이다 — 아이 화면 세션이 쓴다.
 */
const authRefs = new Set(
  (await prisma.devAuthUser.findMany({ select: { id: true } })).map((u) => u.id),
);
const orphans = (await prisma.guardianAccount.findMany({ select: { id: true, authRef: true } }))
  .filter((g) => g.authRef !== "dev-guardian" && !authRefs.has(g.authRef));

if (users.length === 0 && orphans.length === 0) {
  console.log("남은 것 없음"); await prisma.$disconnect(); process.exit(0);
}
if (orphans.length > 0) console.log(`고아 보호자 ${orphans.length}건 (인증 사용자가 없다)`);

console.log(`${APPLY ? "지운다" : "미리 보기"} — 검증 계정 ${users.length}건`);
for (const u of users) console.log("  " + u.email);

if (APPLY) {
  for (const u of users) {
    const gs = await prisma.guardianAccount.findMany({ where: { authRef: u.id }, select: { id: true } });
    for (const g of gs) {
      const kids = await prisma.childAccount.findMany({ where: { guardianId: g.id }, select: { id: true } });
      const ids = kids.map((k) => k.id);
      const byChild = { childId: { in: ids } };
      const missions = await prisma.mission.findMany({ where: { guardianId: g.id }, select: { id: true } });
      await prisma.$transaction([
        prisma.missionPhoto.deleteMany({ where: { missionId: { in: missions.map((m) => m.id) } } }),
        prisma.notification.deleteMany({ where: { guardianId: g.id } }),
        prisma.appEvent.deleteMany({ where: byChild }),
        prisma.cardTransaction.deleteMany({ where: byChild }),
        prisma.childItem.deleteMany({ where: byChild }),
        prisma.childOnboarding.deleteMany({ where: byChild }),
        prisma.childRoom.deleteMany({ where: byChild }),
        prisma.childSchedule.deleteMany({ where: byChild }),
        prisma.forestSnapshot.deleteMany({ where: byChild }),
        prisma.learningProgress.deleteMany({ where: byChild }),
        prisma.planCard.deleteMany({ where: byChild }),
        prisma.spendingRecord.deleteMany({ where: byChild }),
        prisma.starLedgerEntry.deleteMany({ where: byChild }),
        prisma.practiceCredit.deleteMany({ where: byChild }),
        prisma.savingsPlan.deleteMany({ where: byChild }),
        prisma.treeState.deleteMany({ where: byChild }),
        prisma.wishlist.deleteMany({ where: byChild }),
        prisma.allowanceEntry.deleteMany({ where: byChild }),
        prisma.mission.deleteMany({ where: { guardianId: g.id } }),
        prisma.childInvite.deleteMany({ where: { guardianId: g.id } }),
        prisma.deviceSession.deleteMany({ where: { guardianId: g.id } }),
        prisma.childAccount.deleteMany({ where: { guardianId: g.id } }),
        prisma.guardianAccount.delete({ where: { id: g.id } }),
      ]);
    }
    await prisma.devAuthSession.deleteMany({ where: { userId: u.id } });
    await prisma.devAuthUser.delete({ where: { id: u.id } });
  }
  // 🔴 고아 보호자 — 위 반복이 못 잡은 것
  for (const g of orphans) {
    const kids = await prisma.childAccount.findMany({ where: { guardianId: g.id }, select: { id: true } });
    const ids = kids.map((k) => k.id);
    const byChild = { childId: { in: ids } };
    const missions = await prisma.mission.findMany({ where: { guardianId: g.id }, select: { id: true } });
    await prisma.$transaction([
      prisma.missionPhoto.deleteMany({ where: { missionId: { in: missions.map((m) => m.id) } } }),
      prisma.notification.deleteMany({ where: { guardianId: g.id } }),
      prisma.appEvent.deleteMany({ where: byChild }),
      prisma.cardTransaction.deleteMany({ where: byChild }),
      prisma.childItem.deleteMany({ where: byChild }),
      prisma.childOnboarding.deleteMany({ where: byChild }),
      prisma.childRoom.deleteMany({ where: byChild }),
      prisma.childSchedule.deleteMany({ where: byChild }),
      prisma.forestSnapshot.deleteMany({ where: byChild }),
      prisma.learningProgress.deleteMany({ where: byChild }),
      prisma.planCard.deleteMany({ where: byChild }),
      prisma.spendingRecord.deleteMany({ where: byChild }),
      prisma.starLedgerEntry.deleteMany({ where: byChild }),
      prisma.practiceCredit.deleteMany({ where: byChild }),
      prisma.savingsPlan.deleteMany({ where: byChild }),
      prisma.treeState.deleteMany({ where: byChild }),
      prisma.wishlist.deleteMany({ where: byChild }),
      prisma.allowanceEntry.deleteMany({ where: byChild }),
      prisma.mission.deleteMany({ where: { guardianId: g.id } }),
      prisma.childInvite.deleteMany({ where: { guardianId: g.id } }),
      prisma.deviceSession.deleteMany({ where: { guardianId: g.id } }),
      prisma.childAccount.deleteMany({ where: { guardianId: g.id } }),
      prisma.guardianAccount.delete({ where: { id: g.id } }),
    ]);
  }
  console.log("거뒀다");
} else {
  console.log("\n실제로 지우려면 --yes");
}
await prisma.$disconnect();
