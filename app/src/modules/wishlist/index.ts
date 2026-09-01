import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import { record as recordAllowance } from "@/modules/allowance";

import { MILESTONES, type Milestone, type WishlistView, type WishView } from "@/contracts/wishlist";

/**
 * 위시리스트 — PRC-004.
 *
 * 🔴 **퍼센트를 저장하지 않는다.** 모은 금액과 목표 금액에서 매번 계산한다.
 *    저장하면 금액을 고칠 때 퍼센트가 따라오지 않아 둘이 어긋난다.
 */

function percentOf(saved: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.floor((saved / target) * 100));
}

/** 이번 달에 순위를 바꿀 수 있는 횟수 — 월 1회 */
function rankChangesLeft(dates: (Date | null)[]) {
  const now = new Date();
  const usedThisMonth = dates.some(
    (d) => d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(),
  );
  return usedThisMonth ? 0 : 1;
}

export async function getWishlist(childId: string): Promise<WishlistView> {
  const rows = await prisma.wishlist.findMany({
    where: { childId },
    orderBy: { rank: "asc" },
    select: {
      id: true, name: true, targetAmount: true, savedAmount: true,
      rank: true, reachedSteps: true, rankChangedAt: true,
    },
  });

  const wishes: WishView[] = rows.map((r) => {
    const percent = percentOf(r.savedAmount, r.targetAmount);
    const reached = (Array.isArray(r.reachedSteps) ? r.reachedSteps : []) as Milestone[];
    const next = MILESTONES.find((m) => percent < m) ?? null;
    return {
      id: r.id, name: r.name, targetAmount: r.targetAmount, savedAmount: r.savedAmount,
      percent, rank: r.rank, reached, nextMilestone: next,
      // 🔴 퍼센트보다 구체적이다 — 300,000원 목표에 1,000원은 0% 로 내려간다
      remaining: Math.max(0, r.targetAmount - r.savedAmount),
    };
  });

  return { wishes, rankChangesLeft: rankChangesLeft(rows.map((r) => r.rankChangedAt)) };
}

/**
 * ── 쓰기 ──────────────────────────────────────────────
 *
 * 🔴 **여기까지가 없어서 화면이 읽기 전용이었다.** 「갖고 싶은 것에 적어 두세요」라고
 *    학습에서 안내하는데 적을 방법이 없었다.
 *
 * 🔴 **모은 돈은 아무 숫자나 적는 게 아니다.** 보호자가 준 **용돈 잔액에서 떼어 온다**
 *    (어긋남 대장 D18). 예전엔 아이가 아무 금액이나 적을 수 있어서, 100원짜리 목표를
 *    만들어 별을 무한히 받을 수 있었다 — 그러면 실천 지표(WPA)가 통째로 거짓이 된다.
 *    이제 **없는 돈은 못 넣는다.** 그게 이 앱이 가르치려는 것이기도 하다.
 */

/** 동시에 가질 수 있는 목표 수 — 많으면 목표가 목표가 아니게 된다 */
export const MAX_WISHES = 5;
export const MIN_TARGET = 1_000;
export const MAX_TARGET = 1_000_000;
/** 한 번에 적을 수 있는 금액 — 손이 미끄러진 0 하나를 막는다 */
export const MAX_DEPOSIT = 100_000;

export type WishWriteResult =
  | { ok: true }
  | { ok: false; reason: "TOO_MANY" | "BAD_NAME" | "BAD_TARGET" | "BAD_AMOUNT" | "NOT_FOUND" | "RANK_USED" | "NOT_ENOUGH" };

export async function addWish(childId: string, name: string, targetAmount: number): Promise<WishWriteResult> {
  const clean = name.trim();
  if (!clean || clean.length > 30) return { ok: false, reason: "BAD_NAME" };
  if (!Number.isFinite(targetAmount) || targetAmount < MIN_TARGET || targetAmount > MAX_TARGET) {
    return { ok: false, reason: "BAD_TARGET" };
  }

  const count = await prisma.wishlist.count({ where: { childId } });
  if (count >= MAX_WISHES) return { ok: false, reason: "TOO_MANY" };

  const last = await prisma.wishlist.findFirst({
    where: { childId }, orderBy: { rank: "desc" }, select: { rank: true },
  });
  await prisma.wishlist.create({
    data: { childId, name: clean, targetAmount: Math.floor(targetAmount), rank: (last?.rank ?? 0) + 1 },
  });
  return { ok: true };
}

/**
 * 모은 돈을 적는다 → 단계에 닿으면 ⭐.
 *
 * 🔴 **진행률이 내려갔다 다시 올라도 두 번 주지 않는다** (REQ-TEC-011).
 *    `reachedSteps` 는 줄어들지 않는다 — 지나온 단계는 지나온 것이다.
 * 🔴 위시리스트 도달은 **WPA 분자에 든다** (PRC-004). 그래서 `PracticeCredit` 을 남긴다 —
 *    퀴즈와 다른 점이다. 이걸 안 남기면 **부모 나무가 영원히 자라지 않는다.**
 */
export async function deposit(childId: string, wishId: string, amount: number): Promise<WishWriteResult> {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_DEPOSIT) {
    return { ok: false, reason: "BAD_AMOUNT" };
  }
  const w = await prisma.wishlist.findFirst({
    where: { id: wishId, childId },
    select: { id: true, name: true, targetAmount: true, savedAmount: true, reachedSteps: true },
  });
  if (!w) return { ok: false, reason: "NOT_FOUND" };

  // 🔴 **용돈 잔액에서 떼어 온다.** 없는 돈은 못 넣는다 — 장부가 현실과 어긋나면
  //    이 화면은 아무 의미가 없다. 멱등키에 지금 모인 금액을 넣어 연타를 막는다
  const moved = await recordAllowance(
    childId, -Math.floor(amount), "WISH_SET_ASIDE", `${w.name}에 넣었어요`,
    `wish-save:${w.id}:${w.savedAmount}:${Math.floor(amount)}`,
  );
  if (!moved.ok) return { ok: false, reason: "NOT_ENOUGH" };
  if (moved.duplicated) return { ok: true };

  const saved = w.savedAmount + Math.floor(amount);
  const reached = (Array.isArray(w.reachedSteps) ? w.reachedSteps : []) as Milestone[];
  const percent = percentOf(saved, w.targetAmount);
  const newly = MILESTONES.filter((m) => percent >= m && !reached.includes(m));

  await prisma.wishlist.update({
    where: { id: w.id },
    data: { savedAmount: saved, reachedSteps: [...reached, ...newly] },
  });

  for (const m of newly) {
    const now = new Date();
    const credit = await prisma.practiceCredit.create({
      data: {
        childId, triggerCode: "WISHLIST_REACHED", triggerPath: "PRACTICE",
        topic: "SAVE", approvalMode: "auto",
        earnedAt: now, awardedAt: now, cycleId: cycleOf(now),
      },
    });
    await grantStar({
      childId, triggerCode: "WISHLIST_REACHED", delta: 1,
      idempotencyKey: `wish:${w.id}:${m}`, practiceId: credit.id,
    });
  }
  return { ok: true };
}

/**
 * 목표를 지운다 — 🔴 **떼어 둔 돈은 용돈으로 되돌린다.**
 *    안 되돌리면 아이 돈이 앱 안에서 사라진다. 이미 받은 별은 되돌리지 않는다 —
 *    그때 실제로 모았던 것은 사실이기 때문이다.
 */
export async function removeWish(childId: string, wishId: string): Promise<WishWriteResult> {
  const w = await prisma.wishlist.findFirst({
    where: { id: wishId, childId }, select: { id: true, name: true, savedAmount: true },
  });
  if (!w) return { ok: false, reason: "NOT_FOUND" };

  await prisma.wishlist.delete({ where: { id: w.id } });
  if (w.savedAmount > 0) {
    await recordAllowance(
      childId, w.savedAmount, "WISH_RELEASE", `${w.name}에서 되돌렸어요`,
      `wish-release:${w.id}`,
    );
  }
  return { ok: true };
}

/**
 * 순위를 한 칸 올린다 — 🔴 **월 1회다** (PRC-004).
 *    자주 바꾸면 목표가 목표가 아니게 된다.
 */
export async function raiseRank(childId: string, wishId: string): Promise<WishWriteResult> {
  const rows = await prisma.wishlist.findMany({
    where: { childId }, orderBy: { rank: "asc" },
    select: { id: true, rank: true, rankChangedAt: true },
  });
  if (rankChangesLeft(rows.map((r) => r.rankChangedAt)) <= 0) return { ok: false, reason: "RANK_USED" };

  const i = rows.findIndex((r) => r.id === wishId);
  if (i <= 0) return { ok: false, reason: "NOT_FOUND" };

  const me = rows[i], above = rows[i - 1];
  const today = new Date();
  await prisma.$transaction([
    prisma.wishlist.update({ where: { id: me.id }, data: { rank: above.rank, rankChangedAt: today } }),
    prisma.wishlist.update({ where: { id: above.id }, data: { rank: me.rank } }),
  ]);
  return { ok: true };
}

/** 귀속 주기 — 미션과 같은 규칙 */
function cycleOf(d: Date) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}
