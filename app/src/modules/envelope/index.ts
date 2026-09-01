import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import { getBalance } from "@/modules/allowance";
import { categoryOf } from "@/contracts/plan";

/**
 * 봉투형 소비 관리 — `FR-020` · `FR-021`. 어긋남 대장 D32.
 *
 * 🔴 **봉투는 표시용 구획이다.** 실제 선불 잔액은 하나이고 앱은 배분만 보여준다.
 *    봉투마다 진짜 지갑이 있는 게 아니다 — 합이 곧 쓸 수 있는 돈이다.
 *
 * 🔴 **⭐ 판정은 결제 시각의 스냅샷으로 한다** (`AC-021-3`).
 *    사후에 봉투를 늘려 판정을 뒤집을 수 있으면 「계획대로 썼다」가 무의미해진다.
 *
 * 🔴 **봉투를 넘어도 결제는 통과한다** (`AC-021-2`). 아이를 매장에서 세우지 않는다 —
 *    앱은 카드가 아니라 **장부**다. 넘긴 것은 ⭐ 미지급으로만 말한다.
 */

export const MAX_ENVELOPES = 6;

export type EnvelopeView = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly allocated: number;
  /** 배분 이후에 쓴 돈 */
  readonly spent: number;
  /** 남은 돈. 🔴 넘겼으면 0이다 — 음수를 보여주면 아이가 빚으로 읽는다 */
  readonly remaining: number;
  /** 넘긴 금액. 0보다 크면 넘긴 것이다 */
  readonly overBy: number;
  readonly isDefault: boolean;
  readonly categories: readonly string[];
};

export type EnvelopeBoard = {
  readonly envelopes: readonly EnvelopeView[];
  /** 지금 쓸 수 있는 돈 (용돈 원장) */
  readonly wallet: number;
  /** 봉투에 담은 합계 */
  readonly allocatedTotal: number;
  /** 아직 안 담은 돈 */
  readonly unallocated: number;
};

/** 처음 열 때 만들어 두는 봉투 — 🔴 빈 화면에서 아이가 무엇을 만들지 모른다 */
const STARTER = [
  { name: "간식", emoji: "🍬", categories: ["SNACK"] },
  { name: "문구", emoji: "🖊", categories: ["STATIONERY"] },
  { name: "책", emoji: "📚", categories: ["BOOK"] },
  { name: "그 밖에", emoji: "📦", categories: [] as string[], isDefault: true },
];

/**
 * 봉투가 없으면 만들어 둔다. 🔴 **멱등이다** — 이미 있으면 아무 일도 안 한다.
 * 🔴 미분류 봉투는 **반드시 하나** 있어야 한다. 없으면 업종을 못 고른 결제가 갈 곳이 없다.
 */
export async function ensureEnvelopes(childId: string) {
  const n = await prisma.envelope.count({ where: { childId } });
  if (n > 0) return;
  await prisma.envelope.createMany({
    data: STARTER.map((e, i) => ({
      childId, name: e.name, emoji: e.emoji, categories: e.categories,
      isDefault: e.isDefault ?? false, rank: i,
    })),
  });
}

export async function getBoard(childId: string): Promise<EnvelopeBoard> {
  await ensureEnvelopes(childId);

  const [rows, wallet] = await Promise.all([
    prisma.envelope.findMany({ where: { childId }, orderBy: { rank: "asc" } }),
    getBalance(childId),
  ]);

  // 🔴 배분 이후의 지출만 센다. 안 그러면 다시 배분해도 지난 지출이 계속 깎는다
  const spends = await prisma.envelopeSpend.groupBy({
    by: ["envelopeId"],
    where: { childId, refundedAt: null },
    _sum: { amount: true },
    _min: { occurredAt: true },
  });

  const envelopes = await Promise.all(rows.map(async (e) => {
    const agg = await prisma.envelopeSpend.aggregate({
      where: { childId, envelopeId: e.id, refundedAt: null, occurredAt: { gte: e.allocatedAt } },
      _sum: { amount: true },
    });
    const spent = agg._sum.amount ?? 0;
    return {
      id: e.id, name: e.name, emoji: e.emoji, allocated: e.allocated,
      spent,
      // 🔴 음수를 보여주지 않는다. 아이가 빚으로 읽는다
      remaining: Math.max(0, e.allocated - spent),
      overBy: Math.max(0, spent - e.allocated),
      isDefault: e.isDefault, categories: e.categories,
    };
  }));
  void spends;

  const allocatedTotal = envelopes.reduce((n, e) => n + e.allocated, 0);
  return { envelopes, wallet, allocatedTotal, unallocated: Math.max(0, wallet - allocatedTotal) };
}

export type AllocateResult =
  | { ok: true }
  | { ok: false; reason: "OVER_WALLET" | "BAD_AMOUNT" | "NOT_FOUND" };

/**
 * 봉투에 나눠 담는다 — `FR-020`.
 *
 * 🔴 **합계가 쓸 수 있는 돈을 넘으면 저장을 거부한다** (`AC-020-1`).
 *    봉투는 표시용이라 넘겨 담아도 DB 는 받아들이지만, 그러면 **없는 돈을 담은 화면**이 된다.
 * 🔴 **바꾼 것을 이력에 남긴다** (`AC-020-3`). 다그치려는 게 아니라 부모가 아는 것이 요구다.
 */
export async function allocate(
  childId: string, amounts: Record<string, number>,
): Promise<AllocateResult> {
  const rows = await prisma.envelope.findMany({ where: { childId }, orderBy: { rank: "asc" } });
  if (rows.length === 0) return { ok: false, reason: "NOT_FOUND" };

  let total = 0;
  const next = rows.map((e) => {
    const raw = amounts[e.id];
    const v = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : e.allocated;
    total += v;
    return { id: e.id, name: e.name, emoji: e.emoji, allocated: v };
  });
  if (!Number.isFinite(total) || total < 0) return { ok: false, reason: "BAD_AMOUNT" };

  const wallet = await getBalance(childId);
  if (total > wallet) return { ok: false, reason: "OVER_WALLET" };

  const at = new Date();
  await prisma.$transaction([
    ...next.map((e) =>
      prisma.envelope.update({ where: { id: e.id }, data: { allocated: e.allocated, allocatedAt: at } })),
    prisma.envelopeChange.create({
      data: { childId, total, snapshot: next.map(({ name, emoji, allocated }) => ({ name, emoji, allocated })) },
    }),
  ]);
  return { ok: true };
}

/** 🔴 부모 화면이 읽는다 — 아이가 봉투를 바꾼 것을 부모가 안다 (AC-020-3) */
export async function listReallocations(childId: string, take = 10) {
  const rows = await prisma.envelopeChange.findMany({
    where: { childId }, orderBy: { changedAt: "desc" }, take,
    select: { id: true, snapshot: true, total: true, changedAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    at: r.changedAt,
    total: r.total,
    envelopes: (r.snapshot as { name: string; emoji: string; allocated: number }[]) ?? [],
  }));
}

export type SettleResult =
  | { ok: true; within: boolean; overBy: number; starred: boolean; envelope: string }
  | { ok: false; reason: "NO_ENVELOPE" | "ALREADY" };

/**
 * 결제 한 건을 봉투에서 뺀다 — `FR-021`.
 *
 * 🔴 **스냅샷을 박아 둔다.** 지금 이 봉투에 얼마가 담겨 있었고 얼마가 남아 있었나 —
 *    나중에 아이가 봉투를 늘려도 이 판정은 안 바뀐다 (`AC-021-3`).
 * 🔴 **넘어도 결제는 통과한다.** ⭐만 안 준다 (`AC-021-2`). 봉투 간 자동 이동도 없다 —
 *    앱이 마음대로 옮기면 아이는 자기 배분을 못 믿는다.
 * 🔴 업종을 못 고르면 **미분류 봉투**에서 뺀다 (`FR-020` 예외).
 */
export async function settlePayment(
  childId: string,
  input: { txnId?: string; merchant: string; category: string; amount: number; occurredAt: Date },
): Promise<SettleResult> {
  await ensureEnvelopes(childId);

  if (input.txnId) {
    const dup = await prisma.envelopeSpend.findUnique({
      where: { txnId: input.txnId }, select: { id: true },
    });
    if (dup) return { ok: false, reason: "ALREADY" };
  }

  const rows = await prisma.envelope.findMany({ where: { childId }, orderBy: { rank: "asc" } });
  const matched = rows.find((e) => e.categories.includes(input.category));
  const target = matched ?? rows.find((e) => e.isDefault) ?? rows[0];
  if (!target) return { ok: false, reason: "NO_ENVELOPE" };

  // 🔴 **결제 시각 기준** 잔액. 이 숫자가 판정의 근거로 박힌다
  const agg = await prisma.envelopeSpend.aggregate({
    where: { childId, envelopeId: target.id, refundedAt: null, occurredAt: { gte: target.allocatedAt } },
    _sum: { amount: true },
  });
  const spent = agg._sum.amount ?? 0;
  const remaining = Math.max(0, target.allocated - spent);
  const amount = Math.max(0, Math.floor(input.amount));
  const within = amount <= remaining;
  const overBy = within ? 0 : amount - remaining;

  await prisma.envelopeSpend.create({
    data: {
      childId, envelopeId: target.id, txnId: input.txnId,
      merchant: input.merchant, category: input.category, amount,
      snapAllocated: target.allocated, snapRemaining: remaining,
      within, overBy, unclassified: matched === undefined,
      occurredAt: input.occurredAt,
    },
  });

  /**
   * 🔴 **봉투 안이면 ⭐1** (`AC-021-1`). 멱등키는 거래 id 라 웹훅이 두 번 와도 한 번이다.
   * 🔴 넘겼다고 **깎지 않는다** (P-03). 미지급일 뿐이다.
   */
  let starred = false;
  if (within && amount > 0) {
    const r = await grantStar({
      childId, triggerCode: "SPENDING_RETRO", delta: 1,
      idempotencyKey: `envelope:${input.txnId ?? `${childId}:${input.occurredAt.getTime()}`}`,
    });
    starred = r.ok && !r.duplicated;
  }

  return { ok: true, within, overBy, starred, envelope: target.name };
}

/** 최근 결제 — 아이 화면이 「어디서 얼마」를 본다 */
export async function recentSpends(childId: string, take = 10) {
  const rows = await prisma.envelopeSpend.findMany({
    where: { childId }, orderBy: { occurredAt: "desc" }, take,
    select: {
      id: true, merchant: true, category: true, amount: true, within: true,
      overBy: true, unclassified: true, occurredAt: true, refundedAt: true,
      envelopeId: true,
    },
  });
  const names = new Map(
    (await prisma.envelope.findMany({ where: { childId }, select: { id: true, name: true, emoji: true } }))
      .map((e) => [e.id, e]),
  );
  return rows.map((r) => ({
    ...r,
    icon: categoryOf(r.category).icon,
    envelopeName: r.envelopeId ? names.get(r.envelopeId)?.name ?? "그 밖에" : "그 밖에",
    envelopeEmoji: r.envelopeId ? names.get(r.envelopeId)?.emoji ?? "📦" : "📦",
  }));
}
