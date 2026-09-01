import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import type {
  GrantStarInput, GrantStarResult, StarEntryView, StarWalletView, StarTriggerCode,
} from "@/contracts/star";

/**
 * 별 원장 엔진 — STR-001.
 *
 * 🔴 **잔액을 따로 저장하지 않는다.** 원장의 합이 잔액이다.
 *    별도 컬럼을 두면 둘이 어긋나는 순간 어느 쪽이 맞는지 알 수 없다 (REQ-NF-006 오류율 0%).
 *
 * 🔴 **중복 지급 0건은 DB 제약이 보증한다.** 애플리케이션 판단에 맡기지 않는다 —
 *    오프라인 큐가 동시에 두 번 보내면 코드로 짠 검사는 둘 다 통과한다.
 *    `idempotency_key` unique 가 두 번째를 거부한다.
 */

const REASON: Record<StarTriggerCode, string> = {
  ONBOARDING_LEARN: "처음 배우기를 마쳤어요",
  ATTENDANCE: "출석했어요",
  QUIZ_CORRECT: "퀴즈를 맞혔어요",
  MISSION_APPROVED: "미션을 해냈어요",
  SPENDING_RETRO: "계획을 지켰어요",
  WISHLIST_REACHED: "모으기 목표에 닿았어요",
  SAVINGS_JOINED: "저금을 시작했어요",
  SAVINGS_DONE: "저금을 끝까지 했어요",
  WARDROBE_SPEND: "아이템을 바꿨어요",
};

const KIND: Record<StarTriggerCode, string> = {
  ONBOARDING_LEARN: "학습", ATTENDANCE: "학습", QUIZ_CORRECT: "학습",
  MISSION_APPROVED: "미션", SPENDING_RETRO: "지킴", WISHLIST_REACHED: "모으기",
  SAVINGS_JOINED: "불리기", SAVINGS_DONE: "불리기", WARDROBE_SPEND: "옷장",
};

/** 아이가 이해할 수 있는 말로 (REQ-NF-014 · P-12) */
function whenLabel(at: Date, now = new Date()) {
  const days = Math.floor((now.getTime() - at.getTime()) / 864e5);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export async function getBalance(childId: string): Promise<number> {
  const agg = await prisma.starLedgerEntry.aggregate({
    where: { childId },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}

export async function getWallet(childId: string, take = 20): Promise<StarWalletView> {
  const [balance, rows] = await Promise.all([
    getBalance(childId),
    prisma.starLedgerEntry.findMany({
      where: { childId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, delta: true, triggerCode: true, createdAt: true },
    }),
  ]);

  const entries: StarEntryView[] = rows.map((r) => {
    const code = r.triggerCode as StarTriggerCode;
    return {
      id: r.id,
      reason: REASON[code] ?? "별이 움직였어요",
      delta: r.delta,
      kind: KIND[code] ?? "기타",
      whenLabel: whenLabel(r.createdAt),
    };
  });

  return { balance, entries };
}

/**
 * 별 증감 기입.
 *
 * 🔴 잔액이 **음수가 되지 않는다.** 별을 빼앗지 않는다는 규칙(P-03)의 코드 쪽 짝이다.
 *    지급은 언제나 통과하고, 차감만 잔액을 본다.
 */
export async function grantStar(input: GrantStarInput): Promise<GrantStarResult> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.starLedgerEntry.aggregate({
      where: { childId: input.childId },
      _sum: { delta: true },
    });
    const balance = agg._sum.delta ?? 0;

    if (input.delta < 0 && balance + input.delta < 0) {
      return { ok: false, reason: "INSUFFICIENT" } as const;
    }

    try {
      await tx.starLedgerEntry.create({
        data: {
          childId: input.childId,
          delta: input.delta,
          triggerCode: input.triggerCode as never,
          balanceAfter: balance + input.delta,
          idempotencyKey: input.idempotencyKey,
          practiceId: input.practiceId,
        },
      });
      return { ok: true, balance: balance + input.delta, duplicated: false } as const;
    } catch (e) {
      // 같은 키가 이미 있다 = 오프라인 큐의 재전송이다. 오류가 아니라 **정상 경로**다
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: true, balance, duplicated: true } as const;
      }
      throw e;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 원장 정산 — FR-012 · AC-012-3 · 어긋남 대장 D39
// ─────────────────────────────────────────────────────────────

export type ReconcileResult = {
  /** 검사한 줄 수 */
  readonly checked: number;
  /** 이번에 새로 격리된 줄 수 */
  readonly quarantined: number;
  /** 지금까지 격리된 줄 전체 */
  readonly totalQuarantined: number;
};

/**
 * 별 원장을 대조한다 — `FR-012` 「이중 기입 후 일일 정산 배치로 대조」.
 *
 * 🔴 **아무도 재지 않고 있었다.** 멱등키가 중복 지급을 막고는 있었지만,
 *    「별 원장 정합성 오류 0%」가 **허용 오차 0인 7개 항목** 중 하나인데
 *    어긋났는지 확인하는 사람이 없었다. 재지 않는 0%는 0%가 아니다.
 *
 * 무엇을 대조하나 — 각 줄의 `balanceAfter` 가 **그 시점까지의 누적합**과 같은가.
 * 어긋나면 그 줄이 기입될 때 잔액이 잘못 계산됐다는 뜻이다.
 *
 * 🔴 **잔액을 고치지 않는다.** 표시만 한다 (`AC-012-3` — 「아동의 잔액은 감소하지 않으며」).
 *    아이가 잘못한 게 아닌데 어제 본 별이 오늘 줄어 있으면 **아이는 이 앱을 못 믿는다.**
 *    바로잡는 것은 사람이 원인을 본 뒤에 할 일이다.
 *
 * 🔴 **지급을 멈추지 않는다.** 「불일치 발생 → 지급을 중단하지 않고 해당 엔트리만 격리」가
 *    요구다. 한 줄이 어긋났다고 아이가 오늘 받을 별을 막으면 벌을 주는 셈이 된다.
 *
 * 🔴 **어긋난 줄이 있을 때만 쓴다.** 읽기 경로에서 부르므로 정상일 때는 조회만 한다.
 *
 * 🔴 `pg_cron` 이 붙으면 배치가 이 함수를 부르면 된다 (`ADR-T02` · `/api/cron/star-reconcile`).
 */
export async function reconcileStars(childId: string): Promise<ReconcileResult> {
  const rows = await prisma.starLedgerEntry.findMany({
    where: { childId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, delta: true, balanceAfter: true, quarantinedAt: true },
  });

  let running = 0;
  const broken: string[] = [];
  for (const r of rows) {
    running += r.delta;
    // 이미 격리된 줄은 다시 세지 않는다 — 뒤 줄이 전부 어긋나 보이는 것을 막는다
    if (r.balanceAfter !== running && r.quarantinedAt === null) broken.push(r.id);
    // 🔴 어긋난 줄 이후는 **그 줄의 값을 믿고** 이어 센다.
    //    누적합을 고집하면 한 줄 때문에 뒤 줄이 전부 어긋난 것으로 보인다
    running = r.balanceAfter;
  }

  if (broken.length > 0) {
    await prisma.starLedgerEntry.updateMany({
      where: { id: { in: broken } },
      data: { quarantinedAt: new Date() },
    });
  }

  const totalQuarantined = await prisma.starLedgerEntry.count({
    where: { childId, quarantinedAt: { not: null } },
  });

  return { checked: rows.length, quarantined: broken.length, totalQuarantined };
}

/** 격리된 줄 — 부모 화면이 「확인이 필요한 기록」으로 보여준다 */
export async function listQuarantined(childId: string, take = 10) {
  return prisma.starLedgerEntry.findMany({
    where: { childId, quarantinedAt: { not: null } },
    orderBy: { createdAt: "desc" }, take,
    select: { id: true, delta: true, triggerCode: true, balanceAfter: true, createdAt: true },
  });
}
