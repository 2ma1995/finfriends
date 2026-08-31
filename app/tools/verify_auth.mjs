/**
 * 보호자 인증 검증 — CON-001 · 🔴 로컬 전용
 *
 * `src/lib/session/guardian-session.ts` 는 `server-only` 와 `next/headers` 에 묶여 있어
 * 평범한 Node 에서 import 되지 않는다. 그래서 **같은 Prisma 질의와 같은 해시 형식**을
 * 여기서 다시 밟아, 실제로 깨질 수 있는 곳(스키마·질의·해시 왕복)을 확인한다.
 *
 * 🔴 형식이 갈라지면 이 스크립트가 통과해도 앱이 틀린다.
 *    `hashPassword` · `hashToken` 을 고치면 여기도 같이 고친다.
 *
 *   node tools/verify_auth.mjs
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const KEYLEN = 64;
const hashToken = (t) => createHash("sha256").update(t).digest("hex");
const hashPassword = (p) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, KEYLEN).toString("hex")}`;
};
const passwordMatches = (p, stored) => {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const a = Buffer.from(key, "hex");
  const b = scryptSync(p, salt, KEYLEN);
  return a.length === b.length && timingSafeEqual(a, b);
};

let failed = 0;
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "  OK  " : "  실패"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed++;
};

const EMAIL = `verify-${randomBytes(4).toString("hex")}@example.test`;
const SECRET = randomBytes(12).toString("base64url") + "1";

console.log("보호자 인증 검증 — CON-001\n");

try {
  // ① 가입 — 인증 사용자와 보호자 계정이 함께 생긴다
  const user = await prisma.devAuthUser.create({
    data: { email: EMAIL, passwordHash: hashPassword(SECRET) },
  });
  const guardian = await prisma.guardianAccount.create({ data: { authRef: user.id } });
  check("가입 — dev_auth.users + guardian_accounts 생성", Boolean(user.id && guardian.id));

  // ② 원문 비밀번호가 저장되지 않는다
  check("비밀번호 원문 미저장", !user.passwordHash.includes(SECRET), "scrypt salt:key 형식");

  // ③ 해시 왕복
  check("올바른 비밀번호 통과", passwordMatches(SECRET, user.passwordHash));
  check("틀린 비밀번호 거부", !passwordMatches(SECRET + "x", user.passwordHash));

  // ④ 이메일 중복 — 대소문자를 구분하지 않는다
  let dup = false;
  try {
    await prisma.devAuthUser.create({
      data: { email: EMAIL.toUpperCase(), passwordHash: hashPassword(SECRET) },
    });
  } catch {
    dup = true;
  }
  check("같은 이메일 대문자로 재가입 차단", dup, "users_email_lower_key");

  // ⑤ 세션 — 서버에는 해시만 남는다
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.devAuthSession.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 864e5) },
  });
  check("세션 원문 토큰 미저장", !session.tokenHash.includes(token));

  // ⑥ currentGuardian 이 밟는 경로 — 토큰 → 세션 → authRef → 보호자
  const found = await prisma.devAuthSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true, expiresAt: true },
  });
  const resolved = found
    ? await prisma.guardianAccount.findUnique({ where: { authRef: found.userId } })
    : null;
  check("토큰 → 보호자 해석", resolved?.id === guardian.id);

  // ⑦ 만료된 세션은 통과하지 못한다
  const stale = await prisma.devAuthSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken("stale-" + token),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  check("만료 세션 거부", stale.expiresAt < new Date());

  // ⑧ 🔴 아동은 자격증명을 갖지 않는다 (REQ-NF-011 · S5)
  const child = await prisma.childAccount.create({
    data: { guardianId: guardian.id, displayName: "검증", birthYear: 2017, state: "ACTIVE" },
  });
  const childAsAuthUser = await prisma.devAuthUser.findFirst({ where: { email: child.id } });
  check("아동 계정에 인증 사용자 없음", childAsAuthUser === null);

  const authUserCount = await prisma.devAuthUser.count();
  const guardianCount = await prisma.guardianAccount.count();
  check(
    "인증 사용자 수 ≤ 보호자 수",
    authUserCount <= guardianCount,
    `인증 ${authUserCount} · 보호자 ${guardianCount}`,
  );

  // ⑨ 기기 토큰은 보호자가 발급한다 — 아이가 스스로 만들 수 없다
  const deviceToken = randomBytes(32).toString("base64url");
  await prisma.deviceSession.create({
    data: {
      guardianId: guardian.id,
      childId: child.id,
      deviceRef: randomBytes(12).toString("hex"),
      mode: "CHILD",
      tokenHash: hashToken(deviceToken),
      expiresAt: new Date(Date.now() + 180 * 864e5),
    },
  });
  const device = await prisma.deviceSession.findUnique({
    where: { tokenHash: hashToken(deviceToken) },
    select: { guardianId: true, childId: true, mode: true },
  });
  check(
    "기기 세션 — 보호자가 발급 · 아이 프로필에 고정",
    device?.mode === "CHILD" && device.childId === child.id && device.guardianId === guardian.id,
  );

  // 정리 — 검증 흔적을 남기지 않는다
  await prisma.deviceSession.deleteMany({ where: { guardianId: guardian.id } });
  await prisma.childAccount.deleteMany({ where: { guardianId: guardian.id } });
  await prisma.guardianAccount.delete({ where: { id: guardian.id } });
  await prisma.devAuthUser.delete({ where: { id: user.id } });
  check("정리 완료", true);
} catch (e) {
  console.error("\n검증 중 예외:", e.message);
  failed++;
}

await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
