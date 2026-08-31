import "server-only";
import { prisma } from "@/db";
import { DEVICE_TYPES } from "@/contracts/child";
import { CARD_STEPS, type DeviceRow, type MockCardState, type MockCardStatus, type MyPageView } from "@/contracts/account";

/**
 * 보호자 계정 관리 — 마이페이지.
 *
 * 🔴 여기가 「화면이 없다」고 남겨뒀던 것들의 자리다:
 *    기기 해제(어긋남 대장 D5-b 할 일) · 아동 모드 PIN(D5 아직 안 한 것) · 로그아웃.
 *
 * 🔴 identity 안에서만 읽는다. activity 와 조인하지 않는다 (REQ-NF-009).
 */

const DEVICE_LABEL = new Map(DEVICE_TYPES.map((d) => [d.value, d.label]));

function dayLabel(d: Date | null) {
  if (!d) return null;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function agoLabel(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

/**
 * 🔴 **가짜 카드 번호를 저장하지 않는다.** 보호자 id 로 매번 만든다.
 *    저장하면 그것이 카드 데이터가 되고, 우리는 카드 데이터를 갖지 않는다 (ADR-003).
 *    앞 네 자리를 `0000` 으로 두어 실제 카드처럼 보이지 않게 한다.
 */
function mockCard(guardianId: string, status: MockCardStatus | null, at: Date | null): MockCardState {
  const tail = guardianId.replace(/[^0-9]/g, "").padStart(4, "0").slice(-4);
  const stepIndex = status === null ? -1 : CARD_STEPS.findIndex((s) => s.status === status);
  return {
    status,
    stepIndex,
    active: status === "ACTIVE",
    issuedLabel: dayLabel(at),
    // 🔴 실제 카드로 보이지 않게 앞자리를 0000 으로 둔다
    maskedNumber: `0000 · **** · **** · ${tail}`,
  };
}

/**
 * 🔴 **카드를 발급하지 않는다.** 다음 단계로만 옮긴다 (D20).
 *    되돌아갈 수 없게 순서를 강제한다 — 시연에서 단계가 뒤엉키면 흐름을 못 보여준다.
 */
export async function advanceMockCard(guardianId: string) {
  const g = await prisma.guardianAccount.findUnique({
    where: { id: guardianId },
    select: { mockCardStatus: true },
  });
  const at = g?.mockCardStatus === null || g?.mockCardStatus === undefined
    ? -1
    : CARD_STEPS.findIndex((s) => s.status === g.mockCardStatus);
  const next = CARD_STEPS[at + 1];
  if (!next) return;

  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: {
      mockCardStatus: next.status,
      // 마지막 단계에 닿은 시각만 남긴다 — 온보딩 6단계가 이걸 본다
      mockCardIssuedAt: next.status === "ACTIVE" ? new Date() : null,
    },
  });
}

export async function resetMockCard(guardianId: string) {
  await prisma.guardianAccount.update({
    where: { id: guardianId },
    data: { mockCardStatus: null, mockCardIssuedAt: null },
  });
}

export async function getMyPage(guardianId: string, email: string): Promise<MyPageView> {
  const [guardian, child, devices] = await Promise.all([
    prisma.guardianAccount.findUnique({
      where: { id: guardianId },
      select: { consentCompleted: true, consentAt: true, childModePinHash: true, mockCardIssuedAt: true, mockCardStatus: true },
    }),
    prisma.childAccount.findFirst({
      where: { guardianId },
      select: { displayName: true, birthYear: true, deviceType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.deviceSession.findMany({
      where: { guardianId, mode: "CHILD", revokedAt: null },
      select: { deviceRef: true, childId: true, createdAt: true, lastSeenAt: true, blockedAttempts: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 기기 줄에 아이 이름을 붙인다. 조인이 아니라 **두 번 조회해 계층에서 합친다**
  const childIds = [...new Set(devices.map((d) => d.childId).filter((v): v is string => v !== null))];
  const names = new Map(
    (
      await prisma.childAccount.findMany({
        where: { id: { in: childIds }, guardianId },
        select: { id: true, displayName: true },
      })
    ).map((c) => [c.id, c.displayName]),
  );

  const deviceRows: DeviceRow[] = devices.map((d) => ({
    deviceRef: d.deviceRef,
    childName: (d.childId && names.get(d.childId)) || "아이",
    registeredLabel: dayLabel(d.createdAt) ?? "",
    lastSeenLabel: agoLabel(d.lastSeenAt),
    blockedAttempts: d.blockedAttempts,
  }));

  return {
    email,
    consentCompleted: guardian?.consentCompleted ?? false,
    consentLabel: dayLabel(guardian?.consentAt ?? null),
    child: child
      ? {
          displayName: child.displayName,
          birthYear: child.birthYear,
          deviceLabel: DEVICE_LABEL.get(child.deviceType as never) ?? "기기 미정",
        }
      : null,
    devices: deviceRows,
    pinSet: Boolean(guardian?.childModePinHash),
    card: mockCard(guardianId, guardian?.mockCardStatus ?? null, guardian?.mockCardIssuedAt ?? null),
  };
}

/** 보호자 이메일. 🔴 `dev_auth` 는 Supabase 이관 때 사라진다 (D10) */
export async function getGuardianEmail(authRef: string) {
  const user = await prisma.devAuthUser.findUnique({ where: { id: authRef }, select: { email: true } });
  return user?.email ?? "";
}

