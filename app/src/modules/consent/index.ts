import "server-only";
import { prisma } from "@/db";
import {
  REQUIRED_KEYS, type CompleteConsentResult, type ConsentItemKey, type ConsentState,
} from "@/contracts/consent";
import {
  AGE_LIMIT, DEVICE_TYPES, NAME_MAX, ageFromBirthYear,
  type ChildProfileInput, type ChildProfileView, type OnboardingProgress,
  type SaveChildProfileResult,
} from "@/contracts/child";

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

// ─────────────────────────────────────────────────────────────
// 온보딩 단계 저장 — §6.1 진입점 2번 `saveOnboardingStep` 의 실체
// ─────────────────────────────────────────────────────────────

/**
 * 아이 프로필 생성 — 온보딩 3단계.
 *
 * 🔴 **동의 없이는 만들지 않는다.** 아동 개인정보 처리의 시작점이므로
 *    순서 자체가 규제 요건이다 (P-05 · P-22 · 다이어그램 A).
 *
 * 🔴 만 14세 미만만 받는다 (F-01). 나이를 넘으면 이 제품의 법적 골격이 성립하지 않는다.
 *
 * MVP 는 아이 한 명이다. 여러 명은 나무·숲·별이 전부 아이 단위라 화면부터 달라진다 —
 * 요구사항에 없으므로 여기서 막고, 필요해지면 요구사항을 먼저 고친다.
 */
export async function createChildProfile(
  guardianId: string,
  input: ChildProfileInput,
): Promise<SaveChildProfileResult> {
  const name = input.displayName.trim();
  if (name.length === 0) return { ok: false, reason: "NAME_REQUIRED" };
  if (name.length > NAME_MAX) return { ok: false, reason: "NAME_TOO_LONG" };

  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(input.birthYear) || input.birthYear > thisYear || input.birthYear < thisYear - 30) {
    return { ok: false, reason: "BIRTH_YEAR_INVALID" };
  }
  if (ageFromBirthYear(input.birthYear) >= AGE_LIMIT) return { ok: false, reason: "TOO_OLD" };

  // 🔴 고르지 않은 것을 통과시키지 않는다. 화면의 `required` 는 클라이언트 검사일 뿐이다.
  //    「아직 없어요」(NONE)가 선택지에 있으므로 빈 값을 허용할 이유가 없다 —
  //    허용하면 「답하지 않음」과 「기기 없음」이 DB 에서 구별되지 않는다.
  if (!DEVICE_TYPES.some((d) => d.value === input.deviceType)) {
    return { ok: false, reason: "DEVICE_TYPE_INVALID" };
  }

  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: guardianId },
    select: { consentCompleted: true },
  });
  if (!guardian?.consentCompleted) return { ok: false, reason: "CONSENT_REQUIRED" };

  const existing = await prisma.childAccount.count({ where: { guardianId } });
  if (existing > 0) return { ok: false, reason: "ALREADY_EXISTS" };

  const child = await prisma.childAccount.create({
    data: {
      guardianId,
      displayName: name,
      birthYear: input.birthYear,
      deviceType: input.deviceType,
      // 동의가 끝난 뒤에만 여기 오므로 바로 활성이다
      state: "ACTIVE",
    },
  });

  return { ok: true, childId: child.id };
}

const DEVICE_LABEL = new Map(DEVICE_TYPES.map((d) => [d.value, d.label]));

/** 아이 조회. identity 안에서만 읽는다 — activity 와 조인하지 않는다 (REQ-NF-009) */
export async function findChild(guardianId: string): Promise<ChildProfileView | null> {
  const child = await prisma.childAccount.findFirst({
    where: { guardianId },
    select: { id: true, displayName: true, birthYear: true, deviceType: true },
    orderBy: { createdAt: "asc" },
  });
  if (!child) return null;
  return {
    id: child.id,
    displayName: child.displayName,
    birthYear: child.birthYear,
    deviceLabel: DEVICE_LABEL.get(child.deviceType as never) ?? "기기 미정",
  };
}

/**
 * 온보딩 진행 상태 — 화면이 단계 상태를 하드코딩하지 않도록 실제 데이터에서 센다.
 * 하드코딩하면 화면은 「3단계 완료」라고 하는데 DB 에는 아이가 없는 상태가 된다.
 */
export async function readOnboardingProgress(guardianId: string): Promise<OnboardingProgress> {
  const [guardian, childCount, deviceCount] = await Promise.all([
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { consentCompleted: true },
    }),
    prisma.childAccount.count({ where: { guardianId } }),
    prisma.deviceSession.count({
      where: { guardianId, mode: "CHILD", revokedAt: null },
    }),
  ]);

  return {
    // 이 함수를 부를 수 있다는 것 자체가 로그인했다는 뜻이다
    accountDone: true,
    consentDone: guardian?.consentCompleted ?? false,
    childDone: childCount > 0,
    deviceDone: deviceCount > 0,
  };
}
