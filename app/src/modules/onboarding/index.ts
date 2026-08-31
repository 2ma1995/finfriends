import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import { TOUR_STEPS, type TourState } from "@/contracts/onboarding";

/**
 * 아이 온보딩 — 어긋남 대장 D13.
 *
 * 🔴 **아이는 설명을 들은 적이 없다.** 보호자는 가입하며 6단계를 밟지만(CON-003),
 *    아이는 기기 토큰으로 열면 곧장 방이 나온다. 「했어요」를 눌러도 별이 바로
 *    안 붙는다는 걸 모르면 아이는 **고장 났다고 느낀다** (AC-6.2).
 *
 * 🔴 **가두지 않는다.** 건너뛰기는 언제나 열려 있다. 아이가 못 빠져나가는 화면을
 *    만들면 그게 첫 경험이 된다.
 */

export async function getTourState(childId: string): Promise<TourState> {
  const row = await prisma.childOnboarding.findUnique({
    where: { childId },
    select: { step: true, finishedAt: true, skippedAt: true },
  });
  if (!row) return { step: 0, finished: false, skipped: false, seen: false };
  return {
    step: Math.min(row.step, TOUR_STEPS - 1),
    finished: row.finishedAt !== null,
    skipped: row.skippedAt !== null,
    seen: true,
  };
}

/** 한 장 넘긴다. 🔴 **한 칸씩만** 움직인다 — 마지막 장으로 건너뛰어 별만 받아 갈 수 없다 */
export async function advanceTour(childId: string, to: number) {
  const cur = await getTourState(childId);
  const next = Math.max(0, Math.min(to, cur.step + 1, TOUR_STEPS - 1));
  await prisma.childOnboarding.upsert({
    where: { childId },
    create: { childId, step: next },
    update: { step: next },
  });
  return next;
}

/**
 * 끝까지 봤다 — 별 1개.
 *
 * 🔴 **마지막 장까지 실제로 온 경우만** 준다. `advanceTour` 가 한 칸씩만 올리므로
 *    여기서 DB 의 step 을 보면 건너뛰기가 불가능하다. 요청에 담긴 숫자를 믿지 않는다.
 * 🔴 멱등키는 `onboarding:<childId>` 하나다. 다시 보기를 몇 번 해도 별은 한 번뿐이다.
 */
export async function finishTour(childId: string) {
  const cur = await getTourState(childId);
  if (cur.step < TOUR_STEPS - 1) return { ok: false as const, reason: "TOO_EARLY" as const };

  const granted = await grantStar({
    childId,
    triggerCode: "ONBOARDING_LEARN",
    delta: 1,
    idempotencyKey: `onboarding:${childId}`,
  });

  await prisma.childOnboarding.upsert({
    where: { childId },
    create: { childId, step: TOUR_STEPS - 1, finishedAt: new Date() },
    update: { finishedAt: new Date() },
  });

  // 이미 받은 뒤 다시 본 것 — 정상이다. 오류가 아니다
  const firstTime = granted.ok && !granted.duplicated;
  return { ok: true as const, firstTime };
}

/** 건너뛰기 — 별은 없다. 다시 붙잡지도 않는다 */
export async function skipTour(childId: string) {
  await prisma.childOnboarding.upsert({
    where: { childId },
    create: { childId, step: 0, skippedAt: new Date() },
    update: { skippedAt: new Date() },
  });
}

/** 다시 보기 — 처음으로 돌린다. 별은 이미 받았으므로 다시 붙지 않는다 */
export async function restartTour(childId: string) {
  await prisma.childOnboarding.upsert({
    where: { childId },
    create: { childId, step: 0 },
    update: { step: 0, skippedAt: null },
  });
}
