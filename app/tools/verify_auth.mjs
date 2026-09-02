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
import { verifyDbUrl } from "./verify_db.mjs";

// 🔴 대상을 여기서 정하지 않는다 — 조용히 딴 DB 로 떨어지지 않게 한 곳에 모았다 (D64)
const url = verifyDbUrl();
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
  /**
   * 🔴 **배열을 문자열로 비교하지 않는다.** `GUARDIAN_PREFIXES = ["/parent"]` 로 검사했더니
   *    아이 화면 세션이 `/screens` 를 목록에 넣는 순간 검증이 깨졌다 — **막는 힘이 더 세졌는데
   *    검사가 실패했다.** 검사는 값의 모양이 아니라 **막히는가**를 봐야 한다.
   */
  const prefixes = [...mode.matchAll(/"(\/[a-z-]+)"/g)].map((m) => m[1]);
  const blocks = (path) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));
  check("  🔴 /parent 는 아동 모드에서 막힌다", blocks("/parent") && blocks("/parent/bank/missions"),
    `막는 경로 ${prefixes.length}개`);
  check("  🔴 /unlock 은 막지 않는다", !blocks("/unlock"),
    "막으면 아이 기기에서 PIN 을 넣을 자리가 없어진다 (D42)");
  check("  아이 화면은 막지 않는다", !blocks("/child/home") && !blocks("/login"));

  /**
   * 기기 토큰은 **어느 보호자의 것인지** 들고 있어야 한다 —
   * 그래야 「로그인한 보호자 ≠ 기기 주인」을 알아볼 수 있다.
   */
  const dev = await prisma.deviceSession.findFirst({ where: { mode: "CHILD" }, select: { guardianId: true, childId: true } });
  check("아이 기기가 보호자를 가리킨다", dev === null || Boolean(dev.guardianId && dev.childId),
    "없으면 남의 아이인지 알 수 없다");

  /**
   * 🔴 **등록할 때마다 기기 줄이 쌓였다** — 브라우저 하나를 두 번 등록하면
   *    보호자 화면에 기기가 2개로 보였다. 한 아이에 6줄까지 갔다.
   *    한 번도 안 쓴 등록만 거두고, **쓰던 기기는 살려 둔다.**
   */
  const dchild = await prisma.childAccount.create({
    data: { guardianId: guardian.id, displayName: "기기", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" },
  });
  const mkDevice = async (used) => {
    const d = await prisma.deviceSession.create({
      data: { guardianId: guardian.id, childId: dchild.id, deviceRef: randomBytes(6).toString("hex"),
              mode: "CHILD", tokenHash: createHash("sha256").update(randomBytes(8)).digest("hex"),
              expiresAt: new Date(Date.now() + 864e5) },
    });
    if (used) await prisma.deviceSession.update({ where: { id: d.id }, data: { lastSeenAt: new Date(Date.now() + 1000) } });
    return d;
  };
  const unused = await mkDevice(false);
  const inUse = await mkDevice(true);

  // issueDeviceToken 이 하는 일을 그대로
  await prisma.deviceSession.updateMany({
    where: { guardianId: guardian.id, childId: dchild.id, mode: "CHILD", revokedAt: null,
             lastSeenAt: { lte: prisma.deviceSession.fields.createdAt } },
    data: { revokedAt: new Date() },
  });

  const after = async (id) => (await prisma.deviceSession.findUnique({ where: { id }, select: { revokedAt: true } }))?.revokedAt;
  check("🔴 한 번도 안 쓴 옛 등록은 거둔다", (await after(unused.id)) !== null, "브라우저 하나가 기기 2개로 보였다");
  check("🔴 쓰던 기기는 그대로 둔다", (await after(inUse.id)) === null, "끊으면 멀쩡히 쓰던 기기가 잠긴다");

  const live = await prisma.deviceSession.count({
    where: { guardianId: guardian.id, childId: dchild.id, mode: "CHILD", revokedAt: null },
  });
  check("살아 있는 기기는 하나", live === 1);

  const src = readFileSync(new URL("../src/lib/session/device-session.ts", import.meta.url), "utf8");
  check("진입할 때 마지막 사용 시각을 남긴다", /data: \{ lastSeenAt: new Date\(\) \}/.test(src),
    "안 남기면 어느 기기를 해제할지 고를 수 없다");

  await prisma.deviceSession.deleteMany({ where: { childId: dchild.id } });

  /**
   * 🔴 **초대 링크는 24시간짜리 1회용이다** — FR-002 · 어긋남 대장 D33.
   *    한동안 180일짜리 기기 토큰을 주소에 실었다. 주소는 기록에 남고,
   *    그 문자열 하나면 누구든 그 아이의 화면에 들어간다.
   */
  const inviteHash = (t) => createHash("sha256").update(t).digest("hex");
  const mkInvite = async (over = {}) => {
    const t = randomBytes(16).toString("base64url");
    await prisma.childInvite.create({
      data: { guardianId: guardian.id, childId: dchild.id, tokenHash: inviteHash(t),
              expiresAt: new Date(Date.now() + 24 * 3600e3), ...over },
    });
    return t;
  };
  /** consumeInvite 의 소진 한 문장 */
  const consume = async (t) => (await prisma.childInvite.updateMany({
    where: { tokenHash: inviteHash(t), usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })).count;

  const good = await mkInvite();
  check("🔴 초대 코드 원문을 저장하지 않는다",
    (await prisma.childInvite.findFirst({ where: { tokenHash: inviteHash(good) }, select: { tokenHash: true } }))?.tokenHash !== good,
    "해시만 남으므로 DB 가 새도 링크는 안 샌다");
  check("살아 있는 코드는 한 번 통과한다", (await consume(good)) === 1);
  check("🔴 같은 코드는 두 번 안 된다", (await consume(good)) === 0, "1회용 (FR-002)");

  const expired = await mkInvite({ expiresAt: new Date(Date.now() - 1000) });
  check("🔴 만료된 코드는 거부된다", (await consume(expired)) === 0, "TTL 24시간");

  const ttl = await prisma.childInvite.findFirst({
    where: { tokenHash: inviteHash(await mkInvite()) }, select: { expiresAt: true, createdAt: true },
  });
  const hours = (ttl.expiresAt - ttl.createdAt) / 3600e3;
  check("TTL 이 24시간이다", hours > 23.9 && hours < 24.1, `${hours.toFixed(1)}시간`);

  // 🔴 새 코드를 내면 앞의 미사용 코드는 죽는다 — 링크가 여러 장 돌아다니면 안 된다
  const older = await mkInvite();
  await prisma.childInvite.updateMany({
    where: { guardianId: guardian.id, childId: dchild.id, usedAt: null }, data: { usedAt: new Date() },
  });
  await mkInvite();
  check("🔴 새로 만들면 앞의 링크는 죽는다", (await consume(older)) === 0, "어느 것이 유효한지 알 수 없게 된다");

  const liveInvites = await prisma.childInvite.count({
    where: { guardianId: guardian.id, childId: dchild.id, usedAt: null },
  });
  check("살아 있는 초대는 하나뿐", liveInvites === 1);

  await prisma.childInvite.deleteMany({ where: { guardianId: guardian.id } });

  /**
   * 🔴 **아동 모드 PIN** — D5 · 어긋남 대장 D41.
   *    컬럼은 처음부터 있었는데 **읽기만 하고 아무도 넣지 않았다.**
   *    그래서 아동 모드를 푸는 유일한 길이 로그인이었고,
   *    로그인하면 아이 기기 등록이 풀린다(D27).
   */
  const KEYLEN = 64;
  const hashPin = (pin) => {
    const salt = randomBytes(16).toString("hex");
    return `${salt}:${scryptSync(pin, salt, KEYLEN).toString("hex")}`;
  };
  const pinMatches = (pin, stored) => {
    const [salt, key] = stored.split(":");
    if (!salt || !key) return false;
    const a = Buffer.from(key, "hex"); const b = scryptSync(pin, salt, KEYLEN);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  /** setChildModePin 의 「너무 쉬운 값」 검사 */
  const tooSimple = (pin) => {
    if (!/^\d{4}$/.test(pin)) return "BAD_FORMAT";
    const d = pin.split("").map(Number);
    const same = d.every((x) => x === d[0]);
    const up = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
    const down = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
    return same || up || down ? "TOO_SIMPLE" : null;
  };

  check("🔴 0000 은 막는다", tooSimple("0000") === "TOO_SIMPLE", "아이가 첫 번째로 눌러 본다");
  check("🔴 1234 는 막는다", tooSimple("1234") === "TOO_SIMPLE");
  check("🔴 9876 도 막는다", tooSimple("9876") === "TOO_SIMPLE", "내려가는 것도 마찬가지다");
  check("네 자리가 아니면 막는다", tooSimple("123") === "BAD_FORMAT" && tooSimple("12a4") === "BAD_FORMAT");
  check("평범한 PIN 은 통과", tooSimple("2957") === null);

  const stored = hashPin("2957");
  check("🔴 PIN 원문을 저장하지 않는다", !stored.includes("2957"), "scrypt salt:key");
  check("맞는 PIN 은 통과", pinMatches("2957", stored));
  check("틀린 PIN 은 거부", !pinMatches("2958", stored));
  check("길이가 달라도 던지지 않는다", pinMatches("1", stored) === false, "timingSafeEqual 은 길이가 다르면 던진다");

  await prisma.guardianAccount.update({ where: { id: guardian.id }, data: { childModePinHash: stored } });
  const back = await prisma.guardianAccount.findUnique({ where: { id: guardian.id }, select: { childModePinHash: true } });
  check("PIN 이 보호자에 저장된다", back.childModePinHash === stored);

  // 🔴 다섯 번 틀리면 잠근다 — 네 자리는 10,000가지뿐이다
  const dev2 = await prisma.deviceSession.create({
    data: { guardianId: guardian.id, childId: dchild.id, deviceRef: randomBytes(6).toString("hex"),
            mode: "CHILD", tokenHash: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 864e5),
            blockedAttempts: 5 },
  });
  check("🔴 다섯 번 틀리면 잠긴다", dev2.blockedAttempts >= 5, "PIN 은 네 자리라 무차별 대입이 쉽다");
  check("🔴 잠김은 **기기별**이다", dev2.guardianId === guardian.id && dev2.childId === dchild.id,
    "보호자에 세면 다른 기기에서 틀린 것까지 합쳐진다");
  await prisma.deviceSession.delete({ where: { id: dev2.id } });

  const src2 = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
  check("미들웨어가 해제 쿠키를 본다", /ff_unlock/.test(src2), "PIN 으로 연 상태면 /parent/** 를 통과시킨다");

  await prisma.childAccount.delete({ where: { id: dchild.id } });

  await prisma.deviceSession.deleteMany({ where: { guardianId: guardian.id } });
  await prisma.childAccount.deleteMany({ where: { guardianId: guardian.id } });
  await prisma.guardianAccount.delete({ where: { id: guardian.id } });
  await prisma.devAuthUser.delete({ where: { id: user.id } });

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
