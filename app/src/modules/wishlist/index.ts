import "server-only";
import { prisma } from "@/db";
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
    };
  });

  return { wishes, rankChangesLeft: rankChangesLeft(rows.map((r) => r.rankChangedAt)) };
}
