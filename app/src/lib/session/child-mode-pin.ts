import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/db";
import { MODE_COOKIE } from "@/lib/session/device-mode";

/**
 * 아동 모드 잠금 해제 PIN — `D5` · `REQ-NF-011` · 어긋남 대장 D41.
 *
 * 🔴 **들어가는 문만 있고 나오는 문이 없었다.** `child_mode_pin_hash` 컬럼은 처음부터
 *    있었는데 **읽기만 하고 아무도 넣지 않았다.** 그래서 아동 모드를 푸는 유일한 길이
 *    로그인이었고(`D27`), 로그인하면 **아이 기기 등록이 풀린다.**
 *    가족 공용 태블릿에서 부모가 잠깐 확인할 때마다 아이가 초대 링크를 다시 열어야 했다.
 *
 * 🔴 **PIN 은 비밀번호가 아니다.** 네 자리라 무차별 대입이 쉽다. 그래서
 *    ① 틀린 횟수를 세고 ② 다섯 번 틀리면 잠그고 ③ 잠긴 동안은 **비밀번호로만** 푼다.
 *    아이가 옆에서 눌러 보는 상황을 전제로 만든다 — 그게 이 PIN 이 놓인 자리다.
 *
 * 🔴 **해제는 잠깐이다.** 기기는 여전히 아이 것이고, 부모가 볼 일을 마치면 돌아간다.
 *    영구히 풀면 아이 손에 열린 부모 화면이 남는다 (`S5`).
 */

const SCRYPT_KEYLEN = 64;
/** 🔴 네 자리 숫자. 아이가 보는 앞에서 부모가 누르는 것이라 길면 안 쓰인다 */
export const PIN_LENGTH = 4;
/** 🔴 다섯 번 틀리면 잠근다. 네 자리는 10,000가지뿐이다 */
export const PIN_MAX_TRIES = 5;
/** 해제가 유지되는 시간. 🔴 짧아야 한다 — 부모가 볼 일은 몇 분이면 끝난다 */
const GRANT_MINUTES = 10;
/** 🔴 해제 표시. 이 쿠키가 있으면 미들웨어가 `/parent/**` 를 통과시킨다 */
export const UNLOCK_COOKIE = "ff_unlock";

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex")}`;
}

function pinMatches(pin: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const a = Buffer.from(key, "hex");
  const b = scryptSync(pin, salt, SCRYPT_KEYLEN);
  // 🔴 길이가 다르면 `timingSafeEqual` 이 던진다. 먼저 본다
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SetPinResult = { ok: true } | { ok: false; reason: "BAD_FORMAT" | "TOO_SIMPLE" };

/**
 * PIN 을 정한다 — **보호자만 부른다.**
 *
 * 🔴 **너무 쉬운 것을 막는다.** `0000` · `1234` 는 아이가 첫 번째로 눌러 본다.
 *    막지 않으면 이 PIN 은 잠금이 아니라 장식이다.
 */
export async function setChildModePin(guardianId: string, pin: string): Promise<SetPinResult> {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return { ok: false, reason: "BAD_FORMAT" };

  const digits = pin.split("").map(Number);
  const allSame = digits.every((d) => d === digits[0]);
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (allSame || ascending || descending) return { ok: false, reason: "TOO_SIMPLE" };

  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { childModePinHash: hashPin(pin) },
  });
  return { ok: true };
}

/** PIN 을 지운다 — 없으면 아동 모드는 로그인으로만 풀린다 (`D27` 로 되돌아간다) */
export async function clearChildModePin(guardianId: string) {
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { childModePinHash: null },
  });
}

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: "NO_PIN" | "NO_DEVICE" | "WRONG"; triesLeft?: number }
  | { ok: false; reason: "LOCKED" };

/**
 * 아이 기기에서 PIN 으로 잠깐 부모 화면을 연다.
 *
 * 🔴 **기기 토큰으로 보호자를 찾는다.** 아동 모드에는 보호자 세션이 없다 —
 *    있으면 그게 `D27` 이 막으려던 상황이다. 이 기기가 어느 보호자의 것인지는
 *    `device_sessions` 가 안다.
 *
 * 🔴 **틀린 횟수를 기기에 센다.** 보호자 계정에 세면 다른 기기에서 틀린 것까지 합쳐진다.
 *    잠기는 것은 **이 기기**여야 한다.
 */
export async function unlockWithPin(deviceToken: string | undefined, pin: string): Promise<UnlockResult> {
  if (!deviceToken) return { ok: false, reason: "NO_DEVICE" };

  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(deviceToken).digest("hex");
  const device = await prisma.deviceSession.findUnique({
    where: { tokenHash },
    select: { id: true, guardianId: true, revokedAt: true, blockedAttempts: true },
  });
  if (!device || device.revokedAt) return { ok: false, reason: "NO_DEVICE" };

  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: device.guardianId },
    select: { childModePinHash: true },
  });
  if (!guardian?.childModePinHash) return { ok: false, reason: "NO_PIN" };

  if (device.blockedAttempts >= PIN_MAX_TRIES) return { ok: false, reason: "LOCKED" };

  if (!pinMatches(pin, guardian.childModePinHash)) {
    const tried = device.blockedAttempts + 1;
    await prisma.deviceSession.update({
      where: { id: device.id },
      data: { blockedAttempts: tried },
    });
    return tried >= PIN_MAX_TRIES
      ? { ok: false, reason: "LOCKED" }
      : { ok: false, reason: "WRONG", triesLeft: PIN_MAX_TRIES - tried };
  }

  // 맞았으니 시도 횟수를 되돌린다
  await prisma.deviceSession.update({
    where: { id: device.id },
    data: { blockedAttempts: 0, lastSeenAt: new Date() },
  });

  const jar = await cookies();
  const expires = new Date(Date.now() + GRANT_MINUTES * 60_000);
  jar.set(UNLOCK_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
  return { ok: true };
}

/**
 * 🔴 **해제를 끝낸다.** 부모가 볼 일을 마치면 아이 기기로 돌려놓는다.
 *    시간이 지나면 쿠키가 스스로 만료되지만, **끝낼 자리가 화면에 있어야** 한다 —
 *    부모가 자리를 뜨면 그때까지 열려 있다.
 */
export async function relock() {
  const jar = await cookies();
  jar.delete(UNLOCK_COOKIE);
  // 🔴 모드 쿠키는 건드리지 않는다. 이 기기는 여전히 아이 것이다
  void MODE_COOKIE;
}
