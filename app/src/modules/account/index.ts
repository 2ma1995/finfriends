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

// ─────────────────────────────────────────────────────────────
// 탈퇴 · 파기 — FR-041 · 어긋남 대장 D36
// ─────────────────────────────────────────────────────────────

/**
 * 탈퇴하면 무엇이 사라지는지 — **누르기 전에** 보여줄 값.
 *
 * 🔴 「데이터를 지웁니다」로는 부족하다 (`AC-041-1`). 보호자가 무엇을 잃는지
 *    **숫자로** 봐야 한다 — 모은 별 몇 개, 자란 나무 몇 칸인지.
 */
export type WithdrawPreview = {
  readonly childName: string | null;
  readonly starsEarned: number;
  readonly grownSlots: number;
  readonly missionsApproved: number;
  readonly allowanceWon: number;
};

export async function getWithdrawPreview(guardianId: string): Promise<WithdrawPreview> {
  const child = await prisma.childAccount.findFirst({
    where: { guardianId }, select: { id: true, displayName: true }, orderBy: { createdAt: "asc" },
  });
  if (!child) {
    return { childName: null, starsEarned: 0, grownSlots: 0, missionsApproved: 0, allowanceWon: 0 };
  }
  const [stars, trees, missions, allowance] = await Promise.all([
    prisma.starLedgerEntry.aggregate({ where: { childId: child.id, delta: { gt: 0 } }, _sum: { delta: true } }),
    prisma.treeState.count({ where: { childId: child.id, stage: { gt: 0 } } }),
    prisma.mission.count({ where: { childId: child.id, state: { in: ["APPROVED", "BACKFILLED"] } } }),
    prisma.allowanceEntry.aggregate({ where: { childId: child.id }, _sum: { delta: true } }),
  ]);
  return {
    childName: child.displayName,
    starsEarned: stars._sum.delta ?? 0,
    grownSlots: trees,
    missionsApproved: missions,
    allowanceWon: allowance._sum.delta ?? 0,
  };
}

/**
 * 🔴 **탈퇴 — 식별 가능한 모든 것을 지운다** (`FR-041` · `AC-041-2`).
 *
 * 🔴 **한 트랜잭션이다.** 중간에 죽으면 절반만 지워진 계정이 남고,
 *    그때부터 그 아이는 화면에도 안 보이는데 데이터는 살아 있는 상태가 된다.
 *
 * 🔴 **표를 하나라도 빠뜨리면 식별 정보가 남는다.** 그래서 목록을 여기 한 곳에 두고,
 *    검증이 「`child_id` 를 가진 모든 표에 0건」을 **DB 에서 직접 세어** 확인한다 —
 *    코드가 아니라 스키마를 기준으로 세야 새 표가 생겨도 잡힌다.
 *
 * 🔴 **선불 잔액은 우리가 환불하지 않는다.** 실제 돈은 제휴사에 있고(`ADR-004`)
 *    환불은 발행사가 한다. 화면이 그 사실을 안내한다.
 *
 * 🔴 **⭐는 환불 대상이 아니다.** 앱 안의 재화이고 현금과 분리돼 있다 (`P-21`).
 */
export async function withdrawAccount(guardianId: string): Promise<{ ok: boolean }> {
  const guardian = await prisma.guardianAccount.findUnique({
    where: { id: guardianId }, select: { authRef: true },
  });
  if (!guardian) return { ok: false };

  const children = await prisma.childAccount.findMany({
    where: { guardianId }, select: { id: true },
  });
  const childIds = children.map((c) => c.id);
  const missions = await prisma.mission.findMany({
    where: { guardianId }, select: { id: true },
  });
  const missionIds = missions.map((m) => m.id);

  const byChild = { childId: { in: childIds } };

  await prisma.$transaction([
    // 미션 사진 — child_id 가 없어 미션 id 로 지운다. 남으면 아동 이미지가 남는다
    prisma.missionPhoto.deleteMany({ where: { missionId: { in: missionIds } } }),

    // activity — 아이 단위
    prisma.appEvent.deleteMany({ where: byChild }),
    prisma.cardTransaction.deleteMany({ where: byChild }),
    prisma.childItem.deleteMany({ where: byChild }),
    prisma.childOnboarding.deleteMany({ where: byChild }),
    prisma.childRoom.deleteMany({ where: byChild }),
    // 🔴 **빠져 있었다** (D52). 하교 시각을 만들며(D41) 여기 안 넣어서
    //    탈퇴한 집의 하교 시각이 계속 남았다. 파기 누락은 규제 항목이다
    prisma.childSchedule.deleteMany({ where: byChild }),
    prisma.forestSnapshot.deleteMany({ where: byChild }),
    prisma.learningProgress.deleteMany({ where: byChild }),
    prisma.planCard.deleteMany({ where: byChild }),
    prisma.practiceCredit.deleteMany({ where: byChild }),
    prisma.savingsPlan.deleteMany({ where: byChild }),
    prisma.spendingRecord.deleteMany({ where: byChild }),
    prisma.starLedgerEntry.deleteMany({ where: byChild }),
    prisma.treeState.deleteMany({ where: byChild }),
    prisma.wishlist.deleteMany({ where: byChild }),
    prisma.allowanceEntry.deleteMany({ where: byChild }),
    prisma.mission.deleteMany({ where: { guardianId } }),

    // identity
    prisma.childInvite.deleteMany({ where: { guardianId } }),
    prisma.deviceSession.deleteMany({ where: { guardianId } }),
    prisma.childAccount.deleteMany({ where: { guardianId } }),
    prisma.guardianAccount.delete({ where: { id: guardianId } }),

    // 🔴 로컬 인증 사용자. Supabase 이관 때는 Auth 쪽 삭제로 바뀐다 (D10)
    prisma.devAuthUser.deleteMany({ where: { id: guardian.authRef } }),
  ]);

  return { ok: true };
}
