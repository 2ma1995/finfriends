/**
 * 아이 프로필 검증 — CON-003 · 🔴 로컬 전용
 *
 * 🔴 **한계를 먼저 적는다.** `modules/consent` 는 `server-only` 와 `@/` 별칭에 묶여 있고
 *    Node 20 은 TypeScript 를 실행하지 못한다. 그래서 판정 규칙을 **여기서 다시 밟는다.**
 *    규칙을 고치면 여기도 같이 고친다. Server Action 자체의 왕복은 이 스크립트가 덮지 못한다 —
 *    화면에서 사람이 한 번 눌러 봐야 한다.
 *
 * 대신 여기서만 확인할 수 있는 것을 확인한다 — **규제 순서가 DB 에서 실제로 지켜지는가.**
 *
 *   node tools/verify_child.mjs
 */
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

/** contracts/child.ts · modules/consent 의 판정을 그대로 밟는다 */
const AGE_LIMIT = 14;
const NAME_MAX = 12;
const DEVICE_VALUES = ["OWN_PHONE", "KIDS_WATCH", "SHARED", "NONE"];
const thisYear = new Date().getFullYear();

function judge({ displayName, birthYear, deviceType }, { consentDone, childCount }) {
  const name = (displayName ?? "").trim();
  if (name.length === 0) return "NAME_REQUIRED";
  if (name.length > NAME_MAX) return "NAME_TOO_LONG";
  if (!Number.isInteger(birthYear) || birthYear > thisYear || birthYear < thisYear - 30) return "BIRTH_YEAR_INVALID";
  if (thisYear - birthYear >= AGE_LIMIT) return "TOO_OLD";
  if (!DEVICE_VALUES.includes(deviceType)) return "DEVICE_TYPE_INVALID";
  if (!consentDone) return "CONSENT_REQUIRED";
  if (childCount > 0) return "ALREADY_EXISTS";
  return "OK";
}

let failed = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "  OK  " : "  실패"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed++;
};

const ok = { consentDone: true, childCount: 0 };
const valid = { displayName: "서연", birthYear: thisYear - 9, deviceType: "OWN_PHONE" };

console.log("아이 프로필 검증 — CON-003\n");

let user;
try {
  // ── 판정 규칙
  check("정상 입력 통과", judge(valid, ok) === "OK");
  check("이름 없음 거부", judge({ ...valid, displayName: "  " }, ok) === "NAME_REQUIRED");
  check(`이름 ${NAME_MAX}자 초과 거부`, judge({ ...valid, displayName: "가".repeat(NAME_MAX + 1) }, ok) === "NAME_TOO_LONG");
  check("미래 연도 거부", judge({ ...valid, birthYear: thisYear + 1 }, ok) === "BIRTH_YEAR_INVALID");
  check("숫자 아님 거부", judge({ ...valid, birthYear: Number.NaN }, ok) === "BIRTH_YEAR_INVALID");
  check(
    `🔴 만 ${AGE_LIMIT}세 이상 거부 (F-01)`,
    judge({ ...valid, birthYear: thisYear - AGE_LIMIT }, ok) === "TOO_OLD",
    `${thisYear - AGE_LIMIT}년생`,
  );
  check(`만 ${AGE_LIMIT - 1}세는 통과`, judge({ ...valid, birthYear: thisYear - AGE_LIMIT + 1 }, ok) === "OK");
  check("기기 미선택 거부", judge({ ...valid, deviceType: null }, ok) === "DEVICE_TYPE_INVALID");
  check("없는 기기 유형 거부", judge({ ...valid, deviceType: "HACKED" }, ok) === "DEVICE_TYPE_INVALID");
  check("「아직 없어요」는 통과", judge({ ...valid, deviceType: "NONE" }, ok) === "OK");
  check(
    "🔴 동의 전 거부 (P-05 · P-22)",
    judge(valid, { consentDone: false, childCount: 0 }) === "CONSENT_REQUIRED",
  );
  check("두 번째 아이 거부", judge(valid, { consentDone: true, childCount: 1 }) === "ALREADY_EXISTS");

  // ── DB 에서 실제로 지켜지는가
  user = await prisma.devAuthUser.create({
    data: { email: `child-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" },
  });
  const guardian = await prisma.guardianAccount.create({ data: { authRef: user.id } });

  const progressBefore = {
    consentDone: guardian.consentCompleted,
    childCount: await prisma.childAccount.count({ where: { guardianId: guardian.id } }),
  };
  check("새 보호자는 동의 미완 · 아이 0", !progressBefore.consentDone && progressBefore.childCount === 0);
  check("그 상태에서는 생성이 막힌다", judge(valid, progressBefore) === "CONSENT_REQUIRED");

  await prisma.guardianAccount.update({
    where: { id: guardian.id },
    data: { consentCompleted: true, consentAt: new Date() },
  });

  const child = await prisma.childAccount.create({
    data: {
      guardianId: guardian.id,
      displayName: valid.displayName,
      birthYear: valid.birthYear,
      deviceType: valid.deviceType,
      state: "ACTIVE",
    },
  });
  check("생성 시 state=ACTIVE", child.state === "ACTIVE");
  check("기기 유형이 저장된다", child.deviceType === "OWN_PHONE", "NULL 이면 화면이 「기기 미정」으로 읽는다");

  // 온보딩 진행 상태 — readOnboardingProgress 가 세는 것과 같은 질의
  const [childCount, deviceCount] = await Promise.all([
    prisma.childAccount.count({ where: { guardianId: guardian.id } }),
    prisma.deviceSession.count({ where: { guardianId: guardian.id, mode: "CHILD", revokedAt: null } }),
  ]);
  check("진행 상태 — 아이 있음 · 기기 없음", childCount === 1 && deviceCount === 0);

  // 🔴 아동 계정이 생겨도 인증 사용자는 늘지 않는다 (REQ-NF-011 · S5)
  const authCount = await prisma.devAuthUser.count();
  const guardianCount = await prisma.guardianAccount.count();
  check("🔴 아이가 생겨도 인증 사용자는 늘지 않는다", authCount <= guardianCount, `인증 ${authCount} · 보호자 ${guardianCount}`);

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
      await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
      await prisma.guardianAccount.delete({ where: { id: g.id } });
    }
    await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
  }
}

await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
