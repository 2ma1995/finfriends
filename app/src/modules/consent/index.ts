import "server-only";
import { prisma } from "@/db";
import {
  REQUIRED_KEYS, type CompleteConsentResult, type ConsentItemKey, type ConsentState,
} from "@/contracts/consent";

/**
 * 동의 게이트 — CON-002.
 *
 * 🔴 **판정은 서버가 한다.** 화면이 「필수 다 눌렀다」고 말해도 믿지 않는다.
 *    Server Action 은 공개 엔드포인트와 동등하므로 폼을 우회한 호출이 들어올 수 있다
 *    (SRS-Tech §6.6 규약 ② · 스킬 304 §2).
 *
 * 🔴 **동의를 캐시하지 않는다.** 이 모듈은 상태를 저장만 하고, 읽는 쪽은 매번 DB 를 본다.
 *    아이 화면 진입 판정은 `verifyChildAccess` 가 진입마다 수행한다 (ACE-8.2).
 *
 * 왜 별도 동의 테이블이 없는가 — 지금 필요한 것은 「완료 여부와 시각」이고
 * `guardian_accounts` 가 그것을 갖는다. 항목별 이력이 필요해지면 표를 새로 만든다.
 * 그때 이 모듈의 공개 표면은 바뀌지 않는다 — 그래서 화면이 여기만 부른다.
 */

export async function completeConsent(
  guardianId: string,
  accepted: readonly ConsentItemKey[],
): Promise<CompleteConsentResult> {
  const missing = REQUIRED_KEYS.filter((k) => !accepted.includes(k));
  if (missing.length > 0) return { ok: false, reason: "MISSING_REQUIRED", missing };

  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { consentCompleted: true, consentAt: new Date() },
  });

  return { ok: true };
}

export async function readConsentState(guardianId: string): Promise<ConsentState> {
  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: guardianId },
    select: { consentCompleted: true, consentAt: true },
  });
  return {
    completed: guardian?.consentCompleted ?? false,
    completedAt: guardian?.consentAt ?? null,
  };
}

/**
 * 동의 철회 — 되돌릴 수 있어야 동의가 동의다.
 *
 * 🔴 아이 기기 토큰을 지우지 않는다. **지울 필요가 없다** —
 *    `verifyChildAccess` 가 진입마다 동의를 조회하므로 이 플래그 하나로 즉시 막힌다.
 *    토큰까지 지우면 재동의 후 기기를 다시 등록해야 한다.
 */
export async function withdrawConsent(guardianId: string): Promise<void> {
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { consentCompleted: false, consentAt: null },
  });
}
