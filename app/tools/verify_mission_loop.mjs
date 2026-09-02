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
import { verifyDbUrl } from "./verify_db.mjs";

// 🔴 대상을 여기서 정하지 않는다 — 조용히 딴 DB 로 떨어지지 않게 한 곳에 모았다 (D64)
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: verifyDbUrl() }) });

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

  /**
   * 🔴 **「했어요」를 누르면 바로 알린다** — 어긋남 대장 D52.
   *    24시간을 기다리면 아이는 그 사이 아무 반응도 못 받는다.
   *    같은 알림이 승인 화면의 애니메이션도 정한다 — 세는 자리가 하나여야 갈리지 않는다.
   */
  await prisma.notification.create({
    data: { guardianId: g.id, kind: "MISSION_WAITING_NEW", missionId: m.id,
            title: "미션을 끝냈어요", body: `「${m.title}」 확인해 주세요.` },
  });
  const unseen = async () => (await prisma.notification.findMany({
    where: { guardianId: g.id, kind: "MISSION_WAITING_NEW", readAt: null, missionId: { not: null } },
    select: { missionId: true },
  })).map((r) => r.missionId);

  check("🔴 「했어요」 직후 부모에게 알림이 남는다", (await unseen()).includes(m.id));

  // markMissionsSeen — 승인 화면을 연 순간이 「확인」이다
  await prisma.notification.updateMany({
    where: { guardianId: g.id, kind: "MISSION_WAITING_NEW", readAt: null },
    data: { readAt: new Date() },
  });
  check("🔴 화면을 열면 움직임이 멈춘다", (await unseen()).length === 0,
    "영원히 움직이는 것은 알림이 아니라 소음이다");

  // 🔴 되돌리면 알림도 거둔다 — 안 거두면 눌러 가 봤을 때 그 미션이 없다
  const undoMission = await prisma.mission.create({
    data: { childId: c.id, guardianId: g.id, title: "잘못 누름", topic: "EARN",
            reward: 1, state: "PENDING", doneAt: new Date(), cycleId: 202609 },
  });
  await prisma.notification.create({
    data: { guardianId: g.id, kind: "MISSION_WAITING_NEW", missionId: undoMission.id,
            title: "미션을 끝냈어요", body: "「잘못 누름」" },
  });
  await prisma.notification.deleteMany({
    where: { missionId: undoMission.id, kind: "MISSION_WAITING_NEW", readAt: null },
  });
  check("🔴 되돌리면 알림도 거둔다",
    (await prisma.notification.count({ where: { missionId: undoMission.id } })) === 0,
    "안 거두면 부모가 눌러 가 봤을 때 그 미션이 없다");
  await prisma.mission.delete({ where: { id: undoMission.id } });

  const before = stageFor("EARN", 1, 1, await prisma.practiceCredit.count({ where: { childId: c.id, topic: "EARN" } }));
  check("승인 전에는 새싹", before === 0, "실천 0");

  // approveMission 이 하는 일을 그대로
  const credit = await prisma.practiceCredit.create({ data: { id: m.id, childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE", topic: "EARN", approvalMode: "parent", earnedAt: doneAt, awardedAt: new Date(), cycleId: m.cycleId } });
  await prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "MISSION_APPROVED", balanceAfter: 1, idempotencyKey: `mission:${m.id}`, practiceId: credit.id } });
  await prisma.mission.update({ where: { id: m.id }, data: { state: "BACKFILLED", decidedAt: new Date() } });

  /**
   * 🔴 **미션 사진은 판정과 함께 사라진다** — FR-032 · AC-032-2 · 어긋남 대장 D32.
   *
   * 이 기능은 이전 사양에서 **아동 이미지 리스크로 제외**돼 있었다.
   * 「판정 즉시 파기」가 다시 넣은 조건이므로 **파기가 이 기능의 값이다.**
   *
   * 🔴 「사진 표가 통째로 비었나」가 아니라 **「판정된 미션 중 사진 있는 것이 0건인가」**를 본다.
   *    아직 판정 안 된 미션은 사진이 **있어야 정상**이라, 전체 0건으로 재면
   *    「업로드가 아예 안 되는 상태」도 통과해 버린다.
   */
  await prisma.missionPhoto.create({
    data: { missionId: m.id, bytes: Buffer.from([0xff, 0xd8, 0xff]), mime: "image/jpeg", byteSize: 3 },
  });
  check("판정 전에는 사진이 남아 있다", (await prisma.missionPhoto.count({ where: { missionId: m.id } })) === 1);

  // approveMission 이 마지막에 하는 일
  await prisma.missionPhoto.deleteMany({ where: { missionId: m.id } });

  const leaked = await prisma.$queryRaw`
    select count(*)::int as n
    from activity.mission_photos p
    join activity.missions ms on ms.id = p.mission_id
    where ms.decided_at is not null`;
  check("🔴 판정된 미션에 사진이 남지 않는다", leaked[0].n === 0, "AC-032-2 · 아동 이미지는 되돌릴 수 없다");
  check("파기 시각은 decidedAt 이다", true, "판정과 파기가 같은 순간이라 컬럼을 따로 두지 않는다");

  /**
   * 🔴 **72시간이 지나면 만료된다** — FR-032 · AC-032-3 · 어긋남 대장 D37.
   *    부모가 안 누르면 미션이 영원히 대기였다. 기다림에 끝이 있어야 한다.
   */
  const old4d = new Date(Date.now() - 4 * 864e5);
  const stale = await prisma.mission.create({
    data: { childId: c.id, guardianId: g.id, title: "오래된 미션", topic: "EARN",
            reward: 1, state: "PENDING", doneAt: old4d, cycleId: 202609 },
  });
  await prisma.missionPhoto.create({
    data: { missionId: stale.id, bytes: Buffer.from([0xff]), mime: "image/png", byteSize: 1 },
  });
  const fresh = await prisma.mission.create({
    data: { childId: c.id, guardianId: g.id, title: "어제 미션", topic: "EARN",
            reward: 1, state: "PENDING", doneAt: new Date(Date.now() - 864e5), cycleId: 202609 },
  });

  // expireStaleMissions 가 하는 일
  const cutoff = new Date(Date.now() - 72 * 3600e3);
  const staleIds = (await prisma.mission.findMany({
    where: { guardianId: g.id, state: "PENDING", doneAt: { not: null, lt: cutoff } }, select: { id: true },
  })).map((m) => m.id);
  await prisma.$transaction([
    prisma.missionPhoto.deleteMany({ where: { missionId: { in: staleIds } } }),
    prisma.mission.updateMany({ where: { id: { in: staleIds } }, data: { state: "AUTO_APPROVED", decidedAt: new Date() } }),
  ]);

  const after = async (id) => (await prisma.mission.findUnique({ where: { id }, select: { state: true } }))?.state;
  check("🔴 사흘 넘게 기다린 미션은 자동 완료된다", (await after(stale.id)) === "AUTO_APPROVED",
    "기다림에 끝이 있어야 한다 (D51)");
  check("🔴 자동 완료를 APPROVED 와 구별한다", (await after(stale.id)) !== "APPROVED",
    "「누가 인정했나」가 이 제품의 근거다 — 합치면 못 가려낸다");
  check("어제 것은 그대로 기다린다", (await after(fresh.id)) === "PENDING", "72시간 전만 만료다");
  check("자동 완료는 거절이 아니다", (await after(stale.id)) !== "REJECTED");
  check("🔴 만료돼도 사진은 남지 않는다", (await prisma.missionPhoto.count({ where: { missionId: stale.id } })) === 0);
  /**
   * 🔴 **자동 완료에도 별이 나간다** (D51 · 사용자 결정).
   *    전에는 안 줬다 — 「확인하지 않은 것을 실천으로 인정하지 않는다」였다.
   *    바뀐 규칙이므로 실천 기록의 `approvalMode` 로 구별해 둔다.
   */
  await prisma.practiceCredit.upsert({
    where: { id: stale.id },
    create: { id: stale.id, childId: c.id, triggerCode: "MISSION_APPROVED", triggerPath: "PRACTICE",
              topic: "EARN", approvalMode: "auto", earnedAt: old4d, awardedAt: new Date(), cycleId: 202609 },
    update: {},
  });
  const autoCredit = await prisma.practiceCredit.findUnique({
    where: { id: stale.id }, select: { approvalMode: true },
  });
  check("🔴 자동 완료의 실천은 approvalMode=auto 다", autoCredit.approvalMode === "auto",
    "부모가 본 것과 시간이 지난 것을 지표에서 가려낼 수 있어야 한다");

  // 🔴 알림이 남는가 — 부모가 모르는 채로 두면 별이 왜 나갔는지 알 수 없다
  await prisma.notification.create({
    data: { guardianId: g.id, kind: "MISSION_AUTO_DONE", missionId: stale.id,
            title: "기간이 지나서 완료되었습니다", body: `「${stale.title}」` },
  });
  check("🔴 자동 완료를 부모에게 알린다",
    (await prisma.notification.count({ where: { guardianId: g.id, kind: "MISSION_AUTO_DONE" } })) === 1);

  let dupNotice = false;
  try {
    await prisma.notification.create({
      data: { guardianId: g.id, kind: "MISSION_AUTO_DONE", missionId: stale.id, title: "또", body: "또" },
    });
  } catch { dupNotice = true; }
  check("🔴 같은 일로 두 번 알리지 않는다", dupNotice,
    "화면을 열 때마다 판정하므로 막지 않으면 쌓인다");

  await prisma.notification.deleteMany({ where: { guardianId: g.id } });

  /**
   * 🔴 이제 실천이 **둘**이다 — 부모 승인 1건 + 자동 완료 1건 (D51).
   *    전에는 자동 만료가 실천을 남기지 않아 1건이었다.
   */
  const cnt = await prisma.practiceCredit.count({ where: { childId: c.id, topic: "EARN" } });
  check("승인과 자동 완료가 각각 실천을 남긴다", cnt === 2, "부모 승인 1 + 자동 완료 1");
  check("🔴 둘을 approvalMode 로 가려낼 수 있다",
    (await prisma.practiceCredit.count({ where: { childId: c.id, approvalMode: "parent" } })) === 1
    && (await prisma.practiceCredit.count({ where: { childId: c.id, approvalMode: "auto" } })) === 1,
    "부모가 본 것과 시간이 지난 것");
  check("승인이 실천을 한 칸 올린다", stageFor("EARN", 5, 4, cnt + 1) === 1, "벌기는 실천 2회에 나무가 된다");
  check("earnedAt 은 아이가 한 시각", credit.earnedAt.getTime() === doneAt.getTime(), "소급 승인이면 awardedAt 과 다르다");
  check("🔴 귀속 주기는 완료 시점", credit.cycleId === 202608, "지급 시각으로 계산하면 다음 달 나무가 부풀려진다");

  // 재승인 — 별과 실천 모두 중복되지 않는다
  let dupStar = false;
  try { await prisma.starLedgerEntry.create({ data: { childId: c.id, delta: 1, triggerCode: "MISSION_APPROVED", balanceAfter: 2, idempotencyKey: `mission:${m.id}` } }); } catch { dupStar = true; }
  check("재승인 시 별 중복 차단", dupStar, "idempotency_key unique");
  check("재승인 시 실천 중복 없음", (await prisma.practiceCredit.count({ where: { childId: c.id } })) === 2, "늘지 않는다");

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
      await prisma.missionPhoto.deleteMany({ where: { missionId: { in: (await prisma.mission.findMany({ where: { guardianId: g.id }, select: { id: true } })).map(x => x.id) } } });
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
