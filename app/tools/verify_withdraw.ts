import "dotenv/config";
import { randomBytes, generateKeyPairSync } from "node:crypto";
import { verifyDbUrl } from "./verify_db.mjs";

/**
 * 🔴 **앱의 DB 를 쓰지 않는다** (어긋남 대장 D64).
 *
 *    이 검증은 계정·아이·원장을 **22개 표에 만들고 지운다.** `dotenv` 를 읽어
 *    `@/db` 를 그대로 쓰면 앱이 보는 DB(지금은 Supabase)에 시험 계정을 쌓는다 —
 *    실제로 한 번 쌓았다.
 *
 *    `@/db` 는 불러오는 순간 `DATABASE_URL` 을 읽으므로, **읽기 전에** 바꿔야 한다.
 *    그래서 정적 `import` 가 아니라 `main()` 안에서 동적으로 불러온다.
 *    (이 실행기는 top-level await 를 못 받는다 — `ERR_REQUIRE_ASYNC_MODULE`)
 */
process.env.DATABASE_URL = verifyDbUrl();

/**
 * 탈퇴하면 정말 아무것도 안 남는가 — FR-041 · AC-041-2 · 🔴 로컬 전용
 *
 * 🔴 **실제 `withdrawAccount` 를 부른다.** 한동안 이 파일이 파기 목록을 **베껴** 갖고 있었다.
 *    이 파일 머리말이 「코드 목록을 다시 세면 빠뜨린 것을 또 빠뜨린다」고 경고했는데
 *    정작 자기가 그러고 있었다 — 그래서 `notifications` 가 **D51 이후 계속 빠져 있던 것**과
 *    `push_subscriptions` 누락을 **둘 다 못 잡았다** (어긋남 대장 D58).
 *
 * 🔴 **씨를 안 뿌린 표는 「미검증」으로 드러낸다.** 표에 줄이 없으면 「지워졌다」가
 *    아무 것도 증명하지 않는다 — 조용히 통과하던 것이 이 검사의 두 번째 구멍이었다.
 *
 *   npm run verify:withdraw
 */

let failed = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`);
  if (!ok) failed += 1;
};

const uuid = () => randomBytes(16).toString("hex").replace(
  /^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5",
);

type Prisma = (typeof import("@/db"))["prisma"];
let prisma: Prisma;

async function main() {
  // 🔴 `DATABASE_URL` 을 바꾼 **뒤에** 불러온다. 위에서 정적으로 불러오면 늦는다
  ({ prisma } = await import("@/db"));
  const { withdrawAccount } = await import("@/modules/account");

  console.log("탈퇴 · 파기 — 식별 가능한 것이 남는가\n");

  const user = await prisma.devAuthUser.create({
    data: { email: `bye-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" },
  });
  const g = await prisma.guardianAccount.create({
    data: { authRef: user.id, consentCompleted: true, consentAt: new Date() },
  });
  const c = await prisma.childAccount.create({
    data: { guardianId: g.id, displayName: "떠남", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" },
  });

  const now = new Date();
  const key = () => `bye:${randomBytes(6).toString("hex")}`;

  // ── 씨 뿌리기 — `child_id` · `guardian_id` 를 가진 **모든** 표에 한 줄씩 ──
  const m = await prisma.mission.create({
    data: { childId: c.id, guardianId: g.id, title: "정리", topic: "EARN", reward: 1, state: "PENDING", doneAt: now },
  });
  await prisma.missionPhoto.create({
    data: { missionId: m.id, bytes: Buffer.from([1, 2, 3]), mime: "image/jpeg", byteSize: 3 },
  });

  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;

  await Promise.all([
    prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "ATTENDANCE", balanceAfter: 1, idempotencyKey: key() } }),
    prisma.allowanceEntry.create({ data: { childId: c.id, delta: 5000, code: "TOPUP", memo: "용돈", idempotencyKey: key(), balanceAfter: 5000 } }),
    prisma.treeState.createMany({ data: (["EARN", "SPEND", "SAVE", "GROW"] as const).map((slot) => ({ childId: c.id, slot, cycleStartedAt: now })) }),
    prisma.wishlist.create({ data: { childId: c.id, name: "자전거", targetAmount: 50000, savedAmount: 1000, rank: 1 } }),
    prisma.deviceSession.create({ data: { guardianId: g.id, childId: c.id, deviceRef: randomBytes(6).toString("hex"), mode: "CHILD", tokenHash: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 864e5) } }),
    prisma.childInvite.create({ data: { guardianId: g.id, childId: c.id, tokenHash: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 864e5) } }),
    // 🔴 아래 열넷이 전에 없었다 — 그래서 「지워졌다」가 아무 것도 증명하지 않았다
    prisma.notification.create({ data: { guardianId: g.id, kind: "MISSION_WAITING", refId: m.id, title: "정리", body: "확인해 주세요" } }),
    prisma.pushSubscription.create({ data: { guardianId: g.id, endpoint: `https://fcm.googleapis.com/fcm/send/bye-${randomBytes(4).toString("hex")}`, p256dh: spki.subarray(spki.length - 65).toString("base64url"), auth: randomBytes(16).toString("base64url") } }),
    prisma.appEvent.create({ data: { id: uuid(), eventType: "TEST", childId: c.id, guardianId: g.id, clientTs: now, idempotencyKey: key(), payload: {} } }),
    prisma.cardTransaction.create({ data: { childId: c.id, amount: 1000, merchant: "문구점", category: "STATIONERY", occurredAt: now } }),
    prisma.childItem.create({ data: { childId: c.id, itemId: "hat-1" } }),
    prisma.childOnboarding.create({ data: { childId: c.id } }),
    prisma.childRoom.create({ data: { childId: c.id } }),
    prisma.childSchedule.create({ data: { childId: c.id, guardianId: g.id, schoolEndMin: 900 } }),
    prisma.forestSnapshot.create({ data: { childId: c.id, yearMonth: "2026-09", finalStages: {}, deltaItems: {}, starsEarned: 1 } }),
    prisma.learningProgress.create({ data: { childId: c.id, topic: "EARN", updatedAt: now } }),
    prisma.planCard.create({ data: { childId: c.id, whereText: "문구점", category: "STATIONERY", limitAmount: 3000, author: "CHILD" } }),
    prisma.practiceCredit.create({ data: { childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", approvalMode: "manual", earnedAt: now, awardedAt: now, cycleId: 1 } }),
    prisma.savingsPlan.create({ data: { childId: c.id, guardianId: g.id, goal: "자전거", amount: 10000, months: 3 } }),
    prisma.spendingRecord.create({ data: { childId: c.id, actualAmount: 1000, merchantCategory: "STATIONERY", matchResult: "MET", occurredAt: now } }),
  ]);

  /** 🔴 스키마에서 표 목록을 얻는다 — 코드 목록을 다시 세면 빠뜨린 것을 또 빠뜨린다 */
  const tablesWith = async (col: string): Promise<string[]> =>
    (await prisma.$queryRawUnsafe<{ t: string }[]>(
      `select table_schema||'.'||table_name as t
         from information_schema.columns
        where column_name = $1 and table_schema in ('identity','activity')
          and table_name not like 'app_events_2%'`, col)).map((r) => r.t);

  const childTables = await tablesWith("child_id");
  const guardianTables = await tablesWith("guardian_id");
  check("검사 대상 표를 스키마에서 찾았다", childTables.length >= 15,
    `child_id ${childTables.length}개 · guardian_id ${guardianTables.length}개`);

  const countIn = async (tables: string[], col: string, id: string) => {
    const per: Record<string, number> = {};
    for (const t of tables) {
      const r = await prisma.$queryRawUnsafe<{ n: number }[]>(
        `select count(*)::int as n from ${t} where ${col} = $1::uuid`, id);
      per[t] = r[0].n;
    }
    return per;
  };

  const beforeChild = await countIn(childTables, "child_id", c.id);
  const beforeGuardian = await countIn(guardianTables, "guardian_id", g.id);

  /**
   * 🔴 **씨를 안 뿌린 표를 드러낸다.** 줄이 없으면 「지워졌다」가 아무 것도 증명하지 않는다.
   *    `mission_photos` 는 두 컬럼이 다 없어(`mission_id` 만 있다) 이 셈법에 안 들어온다 —
   *    아래에서 따로 센다.
   */
  const unseeded = [
    ...Object.entries(beforeChild).filter(([, n]) => n === 0).map(([t]) => `${t}(child_id)`),
    ...Object.entries(beforeGuardian).filter(([, n]) => n === 0).map(([t]) => `${t}(guardian_id)`),
  ].filter((t) => !t.startsWith("identity.child_accounts(child_id)"));

  check("🔴 모든 대상 표에 씨를 뿌렸다", unseeded.length === 0,
    unseeded.length ? `미검증 ${unseeded.length}개 — ${unseeded.join(" · ")}` : "빈 표는 「지워졌다」를 증명하지 못한다");

  const photosBefore = await prisma.missionPhoto.count({ where: { missionId: m.id } });
  check("미션 사진도 뿌렸다", photosBefore > 0);

  // ── 🔴 실제 함수를 부른다. 베끼지 않는다 ──
  await withdrawAccount(g.id);

  const afterChild = await countIn(childTables, "child_id", c.id);
  const afterGuardian = await countIn(guardianTables, "guardian_id", g.id);
  const left = [
    ...Object.entries(afterChild).filter(([, n]) => n > 0).map(([t, n]) => `${t}:${n}`),
    ...Object.entries(afterGuardian).filter(([, n]) => n > 0).map(([t, n]) => `${t}:${n}`),
  ];
  check("🔴 아이·보호자 기록이 0건", left.length === 0, left.length ? `남음 — ${left.join(" · ")}` : "22개 표 전수");
  check("🔴 미션 사진이 0건", (await prisma.missionPhoto.count({ where: { missionId: m.id } })) === 0);
  check("🔴 보호자 계정이 0건", (await prisma.guardianAccount.count({ where: { id: g.id } })) === 0);
  check("🔴 인증 사용자도 0건", (await prisma.devAuthUser.count({ where: { id: user.id } })) === 0);

  // 🔴 뒷정리 — 실패해서 중간에 멈췄어도 시험 데이터를 공유 DB 에 남기지 않는다
  await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
}

main()
  .catch((e) => { console.error(e); failed += 1; })
  .finally(async () => {
    // 🔴 `main` 이 시작 전에 터지면 아직 없다
    await prisma?.$disconnect();
    console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
    process.exit(failed === 0 ? 0 : 1);
  });
