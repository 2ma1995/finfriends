import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/db";

/**
 * 기기 세션 — 어긋남 대장 D5 · 사용자 결정 2026-08-31 (안 A).
 *
 * 🔴 **왜 보호자 세션과 나눴나**
 *    `CON-001` 은 「보호자 세션 만료 → 아동 화면 잠금 → 보호자 재인증」이라고 적었다.
 *    그대로 두면 **부모가 옆에 없을 때 아이가 아무것도 못 한다.**
 *    이 제품의 전제가 「아이가 스스로 실천한다」이므로 성립하지 않는다.
 *
 * 🔴 **그래도 규칙은 지켜진다**
 *    `S5`      아이는 여전히 자격증명이 없다. **기기가 등록된 것**이지 아이가 로그인한 게 아니다.
 *              토큰을 발급하는 것은 **보호자**이고, 토큰은 `/child/**` 밖으로 아무것도 못 연다.
 *    `ACE-8.2` 토큰은 「누구의 아이인가」만 말한다.
 *              **동의는 매 진입마다 DB 를 조회한다** — 토큰이 있다고 건너뛰지 않는다.
 *
 * 넷플릭스와 다른 점 — 넷플릭스는 기기가 **계정 전체**에 로그인돼 프로필 전환이 자유롭지만,
 * 여기서는 기기가 **아이 프로필에 고정**된다. 전환이 되면 아이가 자기 미션을 승인한다.
 */

export const DEVICE_COOKIE = "ff_device_token";

/** 보호자 세션보다 길다. 부모가 옆에 없어도 아이가 계속 쓸 수 있어야 한다 */
const TTL_DAYS = 180;

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type ChildAccess =
  | { ok: true; childId: string; guardianId: string }
  /** 동의 미완 — 🔴 차단하고 `consent_gate_blocked` 를 적재한다 (REQ-NF-008 · S6) */
  | { ok: false; reason: "CONSENT_REQUIRED"; guardianId: string }
  | { ok: false; reason: "NO_DEVICE" | "EXPIRED" | "REVOKED" };

/**
 * 기기 등록 — **보호자만 부른다.** 온보딩 5단계 「자녀 초대·등록」이 이 자리다.
 * 원문 토큰은 여기서 한 번만 나온다. 서버에는 해시만 남는다.
 */
export async function issueDeviceToken(guardianId: string, childId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);

  /**
   * 🔴 **한 번도 안 쓴 옛 등록은 거둬들인다.**
   *
   * 등록할 때마다 줄이 하나씩 생기는데 지우는 사람이 없어서, 브라우저 하나를 두 번
   * 등록하면 보호자 화면에 **기기가 2개**로 보였다. 실제로 그렇게 쌓였다 —
   * 한 아이에 6줄까지 갔다. 보호자는 어느 것을 해제해야 할지 알 수 없다.
   *
   * 🔴 **쓰던 기기는 건드리지 않는다.** `lastSeenAt > createdAt` 이면 실제로 들어온
   *    적이 있는 기기다 — 아이가 태블릿과 폰을 함께 쓸 수 있으므로 그것까지 끊으면
   *    멀쩡히 쓰던 기기가 갑자기 잠긴다. **한 번도 안 들어온 등록만** 거둔다.
   */
  await prisma.deviceSession.updateMany({
    where: {
      guardianId, childId, mode: "CHILD", revokedAt: null,
      lastSeenAt: { lte: prisma.deviceSession.fields.createdAt },
    },
    data: { revokedAt: new Date() },
  });

  await prisma.deviceSession.create({
    data: {
      guardianId,
      childId,
      deviceRef: randomBytes(12).toString("hex"),
      mode: "CHILD",
      tokenHash: hash(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * 아이 화면 진입 판정.
 *
 * 🔴 **두 번 확인한다.** 토큰이 살아 있는가, 그리고 **지금 이 순간 동의가 완료돼 있는가**.
 *    둘째를 캐시하면 `ACE-8.2` 가 깨진다 — 보호자가 동의를 철회해도 아이 화면이 계속 열린다.
 */
export async function verifyChildAccess(token: string | undefined): Promise<ChildAccess> {
  if (!token) return { ok: false, reason: "NO_DEVICE" };

  const device = await prisma.deviceSession.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      id: true, guardianId: true, childId: true, expiresAt: true, revokedAt: true,
      mode: true, lastSeenAt: true,
    },
  });

  if (!device || device.mode !== "CHILD" || !device.childId) return { ok: false, reason: "NO_DEVICE" };
  if (device.revokedAt) return { ok: false, reason: "REVOKED" };
  if (device.expiresAt && device.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };

  // 🔴 동의는 캐시하지 않는다 (ACE-8.2). 매번 본다
  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: device.guardianId },
    select: { consentCompleted: true },
  });
  if (!guardian?.consentCompleted) {
    return { ok: false, reason: "CONSENT_REQUIRED", guardianId: device.guardianId };
  }

  /**
   * 🔴 **마지막 사용 시각을 남긴다.**
   *
   * 이걸 안 적어서 모든 기기 줄의 「마지막 사용」이 등록 시각 그대로였다 —
   * 보호자 화면에 기기가 둘 있어도 **어느 것이 지금 쓰는 것인지 알 수 없었다.**
   * 해제할 것을 고를 수가 없으니 목록이 있으나 마나였다.
   *
   * 🔴 읽기 경로에 쓰기를 넣는 것이므로 **10분에 한 번만** 적는다.
   *    아이 화면은 진입마다 이 함수를 부른다 — 매번 쓰면 화면 한 번에 쓰기 한 번이다.
   */
  const TOUCH_MS = 10 * 60 * 1000;
  if (Date.now() - device.lastSeenAt.getTime() > TOUCH_MS) {
    await prisma.deviceSession.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return { ok: true, childId: device.childId, guardianId: device.guardianId };
}

/** 보호자가 「이 기기 해제」를 누르면 즉시 무효가 된다 */
export async function revokeDevice(guardianId: string, deviceRef: string) {
  await prisma.deviceSession.updateMany({
    where: { guardianId, deviceRef, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** 아동 모드에서 보호자 경로를 두드린 흔적 — S5 가 세는 값 */
export async function recordBlockedAttempt(token: string | undefined) {
  if (!token) return;
  await prisma.deviceSession.updateMany({
    where: { tokenHash: hash(token) },
    data: { blockedAttempts: { increment: 1 }, lastSeenAt: new Date() },
  });
}

/** PIN 대조 — 길이가 달라도 시간이 새지 않게 (해제 흐름에서 쓴다) */
export function pinMatches(pin: string, storedHash: string | null) {
  if (!storedHash) return false;
  const a = Buffer.from(hash(pin));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashPin(pin: string) {
  return hash(pin);
}
