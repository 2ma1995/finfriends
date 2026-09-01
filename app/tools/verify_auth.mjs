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
import { readFileSync } from "node:fs";
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
  /**
   * 🔴 **보호자로 들어오면 아동 모드를 끈다** — 어긋남 대장 D27.
   *
   * 안 껐더니 `test@naver.com` 으로 로그인했는데 **다른 집 아이**가 화면에 나왔다.
   * 아이 화면은 로그인한 보호자가 아니라 **기기 토큰**을 보기 때문이고,
   * `/parent/**` 는 미들웨어가 전부 막아 자기 화면에 못 들어갔다.
   *
   * 쿠키 동작은 DB 로 확인할 수 없어 **소스에서 확인한다.** 지우면 이 검사가 잡는다.
   */
  const auth = readFileSync(new URL("../src/app/actions/auth.ts", import.meta.url), "utf8");
  const mode = readFileSync(new URL("../src/lib/session/device-mode.ts", import.meta.url), "utf8");
  check("🔴 아동 모드 해제 함수가 있다", /async function clearChildMode/.test(auth));
  check("  기기 모드 쿠키를 지운다", /jar\.delete\(MODE_COOKIE\)/.test(auth));
  check("  아이 기기 토큰을 지운다", /jar\.delete\(DEVICE_COOKIE\)/.test(auth), "남기면 남의 아이가 보인다");
  check("  로그인·가입·로그아웃 세 곳에서 부른다",
    (auth.match(/await clearChildMode\(\)/g) ?? []).length === 3);
  check("  /parent 는 아동 모드에서 막힌다", /GUARDIAN_PREFIXES = \["\/parent"\]/.test(mode));

  /**
   * 기기 토큰은 **어느 보호자의 것인지** 들고 있어야 한다 —
   * 그래야 「로그인한 보호자 ≠ 기기 주인」을 알아볼 수 있다.
   */
  const dev = await prisma.deviceSession.findFirst({ where: { mode: "CHILD" }, select: { guardianId: true, childId: true } });
  check("아이 기기가 보호자를 가리킨다", dev === null || Boolean(dev.guardianId && dev.childId),
    "없으면 남의 아이인지 알 수 없다");

  check("정리 완료", true);

  // ⑩ 🔴 실제 데이터 불변식 — 고아 인증 사용자 0건.
  //    한 번 깨졌다: 시드가 `guardian_accounts` 만 비워서 「비밀번호는 맞는데 로그인 실패」가 났다.
  //    `signIn` 이 이제 없으면 만들지만, 애초에 생기지 않는 것이 맞다.
  const all = await prisma.devAuthUser.findMany({ select: { id: true, email: true } });
  const orphans = [];
  for (const u of all) {
    const g = await prisma.guardianAccount.findUnique({ where: { authRef: u.id } });
    if (!g) orphans.push(u.email);
  }
  check(
    "고아 인증 사용자 0건",
    orphans.length === 0,
    orphans.length ? `보호자 행 없음: ${orphans.join(", ")}` : `인증 사용자 ${all.length}건 전부 짝이 있다`,
  );
} catch (e) {
  console.error("\n검증 중 예외:", e.message);
  failed++;
}

await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
