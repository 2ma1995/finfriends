import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/db";
import { issueDeviceToken } from "@/lib/session/device-session";

/**
 * 아이 앱 초대 — `FR-002` · 어긋남 대장 D33.
 *
 * 🔴 **링크에 실리는 것은 자격증명이 아니다.** 한 번 쓰면 죽는 24시간짜리 코드이고,
 *    기기 토큰은 그 코드를 **교환해서 그 자리에서 새로 발급**된다.
 *
 *    한동안 180일짜리 기기 토큰 자체를 주소에 실었다. 주소는 브라우저 기록 · 서버 로그 ·
 *    바깥 링크의 `Referer` · 메신저 미리보기에 남고, **그 문자열 하나면 누구든 그 아이의
 *    화면에 들어간다.** 보호자가 알아차리고 기기를 해제할 때까지 유효했다 (`D24`).
 *
 * 🔴 **아동 독립 로그인이 아니다** (`S5`). 링크를 만드는 주체는 보호자이고 아이는
 *    아무것도 입력하지 않는다. 바뀐 것은 **자격증명 전달 방법**이지 인증 모델이 아니다.
 */

/** 🔴 24시간. 링크는 오래 살수록 위험하다 (`FR-002`) */
const TTL_MS = 24 * 60 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * 초대 코드 발급 — **보호자만 부른다.**
 *
 * 🔴 원문은 여기서 **한 번만** 나온다. 서버에는 해시만 남는다.
 * 🔴 **먼저 있던 미사용 초대를 죽인다.** 살려 두면 링크가 여러 장 돌아다니고,
 *    보호자는 어느 것이 살아 있는지 알 수 없다. 마지막에 만든 것 하나만 유효하다.
 */
export async function issueInvite(guardianId: string, childId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.$transaction([
    prisma.childInvite.updateMany({
      where: { guardianId, childId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.childInvite.create({
      data: { guardianId, childId, tokenHash: hash(token), expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

/** 🔴 동의를 철회하면 **돌아다니는 링크가 전부 무효**가 된다 (`AC-002-4`) */
export async function revokeInvites(guardianId: string) {
  await prisma.childInvite.updateMany({
    where: { guardianId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export type ConsumeResult =
  | { ok: true; guardianId: string; childId: string; token: string; expiresAt: Date }
  /** 🔴 이미 쓰인 링크 — 그 링크가 «어느 아이» 것이었는지는 알려준다 (D78) */
  | { ok: false; reason: "USED"; childId: string }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "CONSENT_REQUIRED" };

/**
 * 초대 코드를 기기 토큰으로 교환한다 — 아이 기기에서 링크를 열 때 부른다.
 *
 * 🔴 **소진이 원자적이어야 한다.** 두 기기가 같은 링크를 동시에 열면 한 쪽만 성립해야 한다.
 *    「읽고 → 검사하고 → 표시한다」로 나누면 그 사이에 둘 다 통과한다.
 *    `updateMany` 의 `where` 에 조건을 전부 넣어 **한 문장으로** 잡는다.
 *
 * 🔴 **왜 틀렸는지 구별해서 돌려준다.** 만료와 사용됨을 뭉뚱그리면 화면이
 *    「부모님께 다시 요청해요」와 「이미 연결된 기기예요」를 가려서 말할 수 없다 (`AC-002-2`).
 *
 * 🔴 **동의는 캐시하지 않는다.** 코드가 살아 있어도 동의가 철회됐으면 거부한다 (`ACE-8.2`).
 */
export async function consumeInvite(token: string | undefined): Promise<ConsumeResult> {
  if (!token) return { ok: false, reason: "NOT_FOUND" };

  const row = await prisma.childInvite.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, guardianId: true, childId: true, expiresAt: true, usedAt: true },
  });
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (row.usedAt) return { ok: false, reason: "USED", childId: row.childId };
  if (row.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };

  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: row.guardianId },
    select: { consentCompleted: true },
  });
  if (!guardian?.consentCompleted) return { ok: false, reason: "CONSENT_REQUIRED" };

  // 🔴 여기서 이긴 쪽만 계속 간다. 진 쪽은 이미 소진된 것으로 본다
  const won = await prisma.childInvite.updateMany({
    where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (won.count !== 1) return { ok: false, reason: "USED", childId: row.childId };

  const { token: deviceToken, expiresAt } = await issueDeviceToken(row.guardianId, row.childId);
  return { ok: true, guardianId: row.guardianId, childId: row.childId, token: deviceToken, expiresAt };
}
