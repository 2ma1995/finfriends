/**
 * 탈퇴하면 정말 아무것도 안 남는가 — FR-041 · AC-041-2 · 🔴 로컬 전용
 *
 * 확인하는 것 — **식별 가능한 레코드가 0건인가.**
 * 표를 하나만 빠뜨려도 아이 기록이 남는데, 코드에 적힌 목록을 다시 세면
 * **빠뜨린 그 표를 똑같이 빠뜨린다.** 그래서 **스키마에서 직접** 센다 —
 * `child_id` · `guardian_id` 를 가진 모든 표를 `information_schema` 로 찾아
 * 한 곳씩 세므로, **새 표가 생겨도 저절로 검사 대상이 된다.**
 *
 *   node tools/verify_withdraw.mjs
 */
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends" }) });

let failed = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`); if (!ok) failed++; };

console.log("탈퇴 · 파기 — 식별 가능한 것이 남는가\n");

let user;
try {
  user = await prisma.devAuthUser.create({ data: { email: `bye-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" } });
  const g = await prisma.guardianAccount.create({ data: { authRef: user.id, consentCompleted: true, consentAt: new Date() } });
  const c = await prisma.childAccount.create({ data: { guardianId: g.id, displayName: "떠남", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" } });

  // 지울 것을 여러 표에 흩뿌린다 — 한 표만 지우고 통과하면 안 된다
  const m = await prisma.mission.create({ data: { childId: c.id, guardianId: g.id, title: "정리", topic: "EARN", reward: 1, state: "PENDING", doneAt: new Date() } });
  await prisma.missionPhoto.create({ data: { missionId: m.id, bytes: Buffer.from([1, 2, 3]), mime: "image/jpeg", byteSize: 3 } });
  await prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "ATTENDANCE", balanceAfter: 1, idempotencyKey: `bye:${randomBytes(4).toString("hex")}` } });
  await prisma.allowanceEntry.create({ data: { childId: c.id, delta: 5000, code: "TOPUP", memo: "용돈", idempotencyKey: `bye:${randomBytes(4).toString("hex")}`, balanceAfter: 5000 } });
  await prisma.treeState.createMany({ data: ["EARN", "SPEND", "SAVE", "GROW"].map((slot) => ({ childId: c.id, slot, cycleStartedAt: new Date() })) });
  await prisma.wishlist.create({ data: { childId: c.id, name: "자전거", targetAmount: 50000, savedAmount: 1000, rank: 1 } });
  await prisma.deviceSession.create({ data: { guardianId: g.id, childId: c.id, deviceRef: randomBytes(6).toString("hex"), mode: "CHILD", tokenHash: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 864e5) } });
  await prisma.childInvite.create({ data: { guardianId: g.id, childId: c.id, tokenHash: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 864e5) } });

  /** 🔴 스키마에서 표 목록을 얻는다 — 코드 목록을 다시 세면 빠뜨린 것을 또 빠뜨린다 */
  const tablesWith = async (col) => (await prisma.$queryRawUnsafe(
    `select table_schema||'.'||table_name as t
       from information_schema.columns
      where column_name = $1 and table_schema in ('identity','activity')
        and table_name not like 'app_events_%'`, col)).map((r) => r.t);

  const childTables = await tablesWith("child_id");
  const guardianTables = await tablesWith("guardian_id");
  check(`검사 대상 표를 스키마에서 찾았다`, childTables.length >= 15,
    `child_id ${childTables.length}개 · guardian_id ${guardianTables.length}개`);

  const countIn = async (tables, col, id) => {
    let n = 0;
    for (const t of tables) {
      const r = await prisma.$queryRawUnsafe(`select count(*)::int as n from ${t} where ${col} = $1::uuid`, id);
      n += r[0].n;
    }
    return n;
  };

  const before = await countIn(childTables, "child_id", c.id);
  check("지우기 전에는 기록이 있다", before > 0, `${before}건`);

  // withdrawAccount 가 하는 일 — 모듈과 같은 순서
  const missionIds = (await prisma.mission.findMany({ where: { guardianId: g.id }, select: { id: true } })).map((x) => x.id);
  const byChild = { childId: { in: [c.id] } };
  await prisma.$transaction([
    prisma.missionPhoto.deleteMany({ where: { missionId: { in: missionIds } } }),
    prisma.appEvent.deleteMany({ where: byChild }),
    prisma.cardTransaction.deleteMany({ where: byChild }),
    prisma.childItem.deleteMany({ where: byChild }),
    prisma.childOnboarding.deleteMany({ where: byChild }),
    prisma.childRoom.deleteMany({ where: byChild }),
    prisma.forestSnapshot.deleteMany({ where: byChild }),
    prisma.learningProgress.deleteMany({ where: byChild }),
    prisma.planCard.deleteMany({ where: byChild }),
    prisma.practiceCredit.deleteMany({ where: byChild }),
    prisma.savingsPlan.deleteMany({ where: byChild }),
    prisma.spendingRecord.deleteMany({ where: byChild }),
    prisma.starLedgerEntry.deleteMany({ where: byChild }),
    prisma.treeState.deleteMany({ where: byChild }),
    prisma.wishlist.deleteMany({ where: byChild }),
    prisma.allowanceEntry.deleteMany({ where: byChild }),
    prisma.mission.deleteMany({ where: { guardianId: g.id } }),
    prisma.childInvite.deleteMany({ where: { guardianId: g.id } }),
    prisma.deviceSession.deleteMany({ where: { guardianId: g.id } }),
    prisma.childAccount.deleteMany({ where: { guardianId: g.id } }),
    prisma.guardianAccount.delete({ where: { id: g.id } }),
    prisma.devAuthUser.deleteMany({ where: { id: user.id } }),
  ]);

  check("🔴 아이 기록이 0건", (await countIn(childTables, "child_id", c.id)) === 0, "AC-041-2 · 표를 하나만 빠뜨려도 남는다");
  check("🔴 보호자 기록이 0건", (await countIn(guardianTables, "guardian_id", g.id)) === 0);
  check("🔴 미션 사진이 0건", (await prisma.missionPhoto.count({ where: { missionId: { in: missionIds } } })) === 0, "아동 이미지는 되돌릴 수 없다");
  check("보호자 계정이 사라졌다", (await prisma.guardianAccount.findUnique({ where: { id: g.id } })) === null);
  check("인증 사용자가 사라졌다", (await prisma.devAuthUser.findUnique({ where: { id: user.id } })) === null, "고아 인증 사용자를 남기지 않는다");

  user = null;
  /**
   * 🔴 **고아가 남지 않는가 — 상시 불변식.**
   *
   *    「떠남」이 그렇게 남았다. 검증의 `catch` 가 `dev_auth.users` 만 지우고
   *    보호자·아이·활동 기록은 남겼다 — **이메일이 없으니 접두사로 못 찾는데
   *    나무·숲 집계에는 잡힌다.**
   *
   *    실제 탈퇴(`withdrawAccount`)는 삭제 전부가 **한 트랜잭션**이라 실패하면
   *    아무것도 안 지워진다 — 그 경로로는 고아가 생기지 않는다.
   *    그래도 여기서 **매번 센다.** 어디서 새든 이 검사에 걸린다.
   *
   * 🔴 `dev-guardian`(시드)은 뺀다. 그것도 `dev_auth` 행이 없지만 일부러 그렇게 만든 것이다.
   */
  const authIds = new Set(
    (await prisma.devAuthUser.findMany({ select: { id: true } })).map((u) => u.id),
  );
  const orphanGuardians = (await prisma.guardianAccount.findMany({ select: { id: true, authRef: true } }))
    .filter((g) => g.authRef !== "dev-guardian" && !authIds.has(g.authRef));
  check("🔴 고아 보호자 0건", orphanGuardians.length === 0,
    orphanGuardians.length ? `${orphanGuardians.length}건 — npm run db:cleanup 으로 거둔다` : "인증 사용자 없는 보호자가 없다");

  const guardianIds = new Set(
    (await prisma.guardianAccount.findMany({ select: { id: true } })).map((g) => g.id),
  );
  const orphanChildren = (await prisma.childAccount.findMany({ select: { id: true, guardianId: true } }))
    .filter((c) => !guardianIds.has(c.guardianId));
  check("🔴 고아 아이 0건", orphanChildren.length === 0, "보호자 없는 아이가 없다");

  const childIdsAll = new Set(
    (await prisma.childAccount.findMany({ select: { id: true } })).map((c) => c.id),
  );
  const orphanStars = (await prisma.starLedgerEntry.findMany({ select: { childId: true } }))
    .filter((s) => !childIdsAll.has(s.childId));
  check("🔴 주인 없는 별 원장 0건", orphanStars.length === 0,
    "아이가 지워졌는데 별이 남으면 숲 집계가 부풀려진다");

  check("정리 완료", true);
} catch (e) {
  console.error("\n예외:", e.message); failed++;
  /**
   * 🔴 **예외가 나면 정리가 덜 됐다.** `dev_auth.users` 만 지우면 보호자·아이가
   *    **고아로 남아** 나무·숲 집계에 섞여 들어간다. 실제로 두 건이 쌓였다.
   *    남는 것이 있어도 `npm run db:cleanup` 이 거둔다 — 그게 마지막 그물이다.
   */
  if (user) await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
}
await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
