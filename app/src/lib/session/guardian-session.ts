import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/db";

/**
 * 보호자 세션 — CON-001.
 *
 * 🔴 **Supabase 이관 시 바뀌는 파일은 여기 하나다.**
 *    지금은 로컬 Postgres 의 `dev_auth` 스키마가 Supabase Auth 를 대신한다.
 *    이관하면 아래 셋만 Supabase 클라이언트 호출로 바뀐다:
 *
 *      createGuardian  → supabase.auth.signUp
 *      signIn          → supabase.auth.signInWithPassword
 *      currentGuardian → supabase.auth.getUser 로 user.id 를 얻은 뒤 동일한 authRef 조회
 *
 *    `guardian_accounts.auth_ref` 의 **의미는 바뀌지 않는다** — 「인증 시스템의 사용자 id」.
 *    그래서 이관은 `dev_auth.users.id` → Supabase user id 이행 하나로 끝난다.
 *
 * 🔴 **아동은 여기 들어오지 않는다.** 자격증명을 갖는 것은 보호자뿐이다
 *    (REQ-NF-011 · S5 · 스킬 304 §4). 아이 기기는 `device-session.ts` 가 따로 연다.
 */

export const GUARDIAN_COOKIE = "ff_guardian";

/**
 * 🔴 기기 세션(180일)보다 **짧다.** 둘의 수명이 다른 것이 D5-b 결정의 핵심이다 —
 *    부모 세션이 죽어도 아이 기기는 계속 열린다.
 *    값은 잠정이다. 온보딩 이탈(US-8 AC3) 실측 뒤 다시 본다.
 */
const TTL_DAYS = 14;

const SCRYPT_KEYLEN = 64;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** `salt:derivedKey`. 원문 비밀번호는 어디에도 남기지 않는다 */
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex")}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const a = Buffer.from(key, "hex");
  const b = scryptSync(password, salt, SCRYPT_KEYLEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 이메일은 대소문자를 구분하지 않는다 — 같은 주소로 계정이 둘 생기면 아이를 못 찾는다 */
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type AuthResult =
  | { ok: true; guardianId: string; token: string; expiresAt: Date }
  | { ok: false; reason: "EMAIL_TAKEN" | "BAD_CREDENTIALS" | "WEAK_PASSWORD" | "INVALID_EMAIL" };

function validate(email: string, password: string): AuthResult | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "INVALID_EMAIL" };
  if (password.length < 8 || !/\d/.test(password)) return { ok: false, reason: "WEAK_PASSWORD" };
  return null;
}

async function openSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);
  await prisma.devAuthSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
}

/**
 * 가입 — 인증 사용자와 보호자 계정을 **함께** 만든다.
 *
 * 🔴 둘이 갈라지면 로그인은 되는데 아이를 등록할 곳이 없는 계정이 생긴다.
 *    Supabase 이관 후에는 인증 쪽이 트랜잭션 밖이므로,
 *    `auth_ref` 로 보호자 행을 찾지 못하면 그때 만드는 방식으로 바꾼다.
 */
export async function createGuardian(emailRaw: string, password: string): Promise<AuthResult> {
  const email = normalizeEmail(emailRaw);
  const invalid = validate(email, password);
  if (invalid) return invalid;

  const existing = await prisma.devAuthUser.findFirst({ where: { email } });
  if (existing) return { ok: false, reason: "EMAIL_TAKEN" };

  const user = await prisma.devAuthUser.create({
    data: { email, passwordHash: hashPassword(password) },
  });
  const guardian = await prisma.guardianAccount.create({ data: { authRef: user.id } });

  const { token, expiresAt } = await openSession(user.id);
  return { ok: true, guardianId: guardian.id, token, expiresAt };
}

/** 로그인. 이메일이 없는 경우와 비밀번호가 틀린 경우를 **구분해 알리지 않는다** */
export async function signIn(emailRaw: string, password: string): Promise<AuthResult> {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.devAuthUser.findFirst({ where: { email } });
  if (!user || !passwordMatches(password, user.passwordHash)) {
    return { ok: false, reason: "BAD_CREDENTIALS" };
  }

  const guardian = await prisma.guardianAccount.findUnique({ where: { authRef: user.id } });
  if (!guardian) return { ok: false, reason: "BAD_CREDENTIALS" };

  const { token, expiresAt } = await openSession(user.id);
  return { ok: true, guardianId: guardian.id, token, expiresAt };
}

export async function closeSession(token: string | undefined) {
  if (!token) return;
  await prisma.devAuthSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export type GuardianContext = {
  guardianId: string;
  authRef: string;
  consentCompleted: boolean;
};

/**
 * 지금 화면을 보는 보호자가 누구인가 — 화면(RSC)과 Server Action 이 부르는 유일한 진입점.
 *
 * 🔴 **동의 상태를 캐시하지 않는다.** 매번 DB 에서 읽는다 (ACE-8.2 · 스킬 304 §2).
 *    쿠키에 담아두면 보호자가 철회해도 화면이 계속 열린다.
 */
export async function currentGuardian(): Promise<GuardianContext | null> {
  const jar = await cookies();
  const token = jar.get(GUARDIAN_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.devAuthSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const guardian = await prisma.guardianAccount.findUnique({
    where: { authRef: session.userId },
    select: { id: true, authRef: true, consentCompleted: true },
  });
  if (!guardian) return null;

  return {
    guardianId: guardian.id,
    authRef: guardian.authRef,
    consentCompleted: guardian.consentCompleted,
  };
}

/**
 * Server Action 첫 줄에서 부르는 인가 확인 (SRS-Tech §6.6 규약 ②).
 * Server Action 은 공개 엔드포인트와 동등하므로 호출된 경로를 신뢰하지 않는다.
 */
export async function requireGuardian(): Promise<GuardianContext> {
  const guardian = await currentGuardian();
  if (!guardian) throw new Error("보호자 인증이 필요하다");
  return guardian;
}
