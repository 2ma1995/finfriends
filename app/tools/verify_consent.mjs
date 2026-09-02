/**
 * 동의 게이트 검증 — CON-002 · 허용 오차 0 항목 1번 · 🔴 로컬 전용
 *
 * 확인하는 것은 하나다 — **동의 없이 아이 화면이 열리지 않는가.**
 * 그리고 그 판정이 **캐시되지 않는가**(ACE-8.2) — 철회하면 토큰이 살아 있어도 막혀야 한다.
 *
 * 🔴 `src/modules/consent/index.ts` 와 `verifyChildAccess` 의 질의를 다시 밟는다.
 *    로직을 고치면 여기도 같이 고친다.
 *
 *   node tools/verify_consent.mjs
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { verifyDbUrl } from "./verify_db.mjs";

// 🔴 대상을 여기서 정하지 않는다 — 조용히 딴 DB 로 떨어지지 않게 한 곳에 모았다 (D64)
const url = verifyDbUrl();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const hash = (t) => createHash("sha256").update(t).digest("hex");

/** contracts/consent.ts 의 REQUIRED_KEYS */
const REQUIRED = ["guardian", "terms", "privacy"];
const missingOf = (accepted) => REQUIRED.filter((k) => !accepted.includes(k));

/** verifyChildAccess 의 판정을 그대로 밟는다 */
async function childAccess(token) {
  const device = await prisma.deviceSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { guardianId: true, childId: true, expiresAt: true, revokedAt: true, mode: true },
  });
  if (!device || device.mode !== "CHILD" || !device.childId) return "NO_DEVICE";
  if (device.revokedAt) return "REVOKED";
  if (device.expiresAt && device.expiresAt < new Date()) return "EXPIRED";
  const g = await prisma.guardianAccount.findUnique({
    where: { id: device.guardianId },
    select: { consentCompleted: true },
  });
  return g?.consentCompleted ? "OK" : "CONSENT_REQUIRED";
}

let failed = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "  OK  " : "  실패"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed++;
};

console.log("동의 게이트 검증 — CON-002\n");

let user;
try {
  // ── 준비: 동의하지 않은 보호자 + 아이 + 등록된 기기
  user = await prisma.devAuthUser.create({
    data: { email: `consent-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" },
  });
  const guardian = await prisma.guardianAccount.create({ data: { authRef: user.id } });
  const child = await prisma.childAccount.create({
    data: { guardianId: guardian.id, displayName: "검증", birthYear: 2017, state: "ACTIVE" },
  });
  const token = randomBytes(32).toString("base64url");
  await prisma.deviceSession.create({
    data: {
      guardianId: guardian.id,
      childId: child.id,
      deviceRef: randomBytes(12).toString("hex"),
      mode: "CHILD",
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + 180 * 864e5),
    },
  });

  check("기본값은 동의 미완", guardian.consentCompleted === false);

  // ① 🔴 동의 전에는 기기 토큰이 있어도 아이 화면이 열리지 않는다
  check("동의 전 아이 화면 차단", (await childAccess(token)) === "CONSENT_REQUIRED");

  // ② 필수 항목 판정 — 서버가 한다
  check("필수 하나 빠지면 거부", missingOf(["guardian", "terms"]).length === 1, "privacy 누락");
  check("선택 항목만 있으면 거부", missingOf(["marketing"]).length === 3);
  check("필수 전부면 통과", missingOf(["guardian", "terms", "privacy"]).length === 0);
  check("선택을 더해도 통과", missingOf(["guardian", "terms", "privacy", "marketing"]).length === 0);

  // ③ 동의 완료 — 시각이 남는다
  const done = await prisma.guardianAccount.update({
    where: { id: guardian.id },
    data: { consentCompleted: true, consentAt: new Date() },
  });
  check("동의 완료 · 시각 기록", done.consentCompleted && done.consentAt instanceof Date);
  check("동의 후 아이 화면 열림", (await childAccess(token)) === "OK");

  // ④ 🔴 철회하면 **토큰이 살아 있어도** 즉시 막힌다 — 동의를 캐시하지 않는다는 뜻이다
  await prisma.guardianAccount.update({
    where: { id: guardian.id },
    data: { consentCompleted: false, consentAt: null },
  });
  const stillThere = await prisma.deviceSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { revokedAt: true },
  });
  check("철회 후 즉시 차단", (await childAccess(token)) === "CONSENT_REQUIRED");
  check("철회는 기기 토큰을 지우지 않는다", stillThere !== null && stillThere.revokedAt === null,
        "재동의하면 다시 등록하지 않아도 된다");

  // ⑤ 재동의 — 같은 토큰으로 다시 열린다
  await prisma.guardianAccount.update({
    where: { id: guardian.id },
    data: { consentCompleted: true, consentAt: new Date() },
  });
  check("재동의 후 같은 토큰으로 열림", (await childAccess(token)) === "OK");

  // 정리
  await prisma.deviceSession.deleteMany({ where: { guardianId: guardian.id } });
  await prisma.childAccount.deleteMany({ where: { guardianId: guardian.id } });
  await prisma.guardianAccount.delete({ where: { id: guardian.id } });
  await prisma.devAuthUser.delete({ where: { id: user.id } });
  check("정리 완료", true);
} catch (e) {
  console.error("\n검증 중 예외:", e.message);
  failed++;
  if (user) {
    const g = await prisma.guardianAccount.findUnique({ where: { authRef: user.id } });
    if (g) {
      await prisma.deviceSession.deleteMany({ where: { guardianId: g.id } });
      await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
      await prisma.guardianAccount.delete({ where: { id: g.id } });
    }
    await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
  }
}

await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
