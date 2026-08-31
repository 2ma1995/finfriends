import "server-only";
import { prisma } from "@/db";
import { grantStar, getBalance } from "@/modules/star-ledger";
import { CATALOG, DEFAULT_CHARACTER, FREE_ITEMS, findItem, type Item } from "@/contracts/items";

/**
 * 방·상점 — 어긋남 대장 D14.
 *
 * 🔴 **여기가 없어서 방이 브라우저 localStorage 를 지갑처럼 썼다.** 별 40개와 보유
 *    아이템이 상수로 박혀 있어, 오늘 가입한 아이가 이미 꾸며진 남의 방을 자기 방으로 봤다.
 *
 * 🔴 **별을 두 군데서 세지 않는다.** 잔액은 언제나 별 원장의 합이다. 상점이 자기
 *    잔액을 따로 들면 둘이 어긋나는 순간 어느 쪽이 맞는지 알 수 없다 (REQ-NF-006).
 */

export type RoomState = {
  readonly stars: number;
  readonly owned: readonly string[];
  readonly characterId: string;
  readonly wear: readonly string[];
  readonly layout: Record<string, { x: number; z: number; ry: number; y?: number }>;
};

/** 값이 0 인 것은 그냥 갖고 시작한다 — 아이를 빈 화면에 혼자 두지 않는다 */
function withFree(owned: string[]) {
  return Array.from(new Set([...FREE_ITEMS, ...owned]));
}

export async function getRoom(childId: string): Promise<RoomState> {
  const [stars, rows, room] = await Promise.all([
    getBalance(childId),
    prisma.childItem.findMany({ where: { childId }, select: { itemId: true } }),
    prisma.childRoom.findUnique({ where: { childId } }),
  ]);

  return {
    stars,
    owned: withFree(rows.map((r) => r.itemId)),
    characterId: room?.characterId ?? DEFAULT_CHARACTER,
    wear: room?.wear ?? [],
    layout: (room?.layout as RoomState["layout"]) ?? {},
  };
}

/** 방에 실제로 놓여 있는 것 — 가진 것 중 아바타가 아닌 것 */
export function placedItems(state: RoomState): readonly Item[] {
  return CATALOG.filter((i) => state.owned.includes(i.id) && i.placement.kind !== "avatar");
}

export type BuyResult =
  | { ok: true; duplicated: boolean }
  | { ok: false; reason: "UNKNOWN_ITEM" | "ALREADY_OWNED" | "NOT_ENOUGH" };

/**
 * 산다 — STR-005.
 *
 * 🔴 **별을 깎는 것과 보유에 넣는 것이 한 거래여야 한다.** 나뉘면 별만 나가고
 *    물건이 안 들어오는 아이가 생긴다. 아이에게는 이게 그냥 도둑맞은 것이다.
 * 🔴 멱등키는 `buy:<child>:<item>` 하나다. 두 번 눌러도 한 번만 나간다 (REQ-NF-003 오프라인 큐).
 * 🔴 잔액 검사는 `grantStar` 안에서 한다 — 원장 합을 보고 0 밑으로 못 간다.
 */
export async function buyItem(childId: string, itemId: string): Promise<BuyResult> {
  const item = findItem(itemId);
  if (!item) return { ok: false, reason: "UNKNOWN_ITEM" };
  if (item.cost === 0) return { ok: false, reason: "ALREADY_OWNED" };

  const already = await prisma.childItem.findUnique({
    where: { childId_itemId: { childId, itemId } },
    select: { itemId: true },
  });
  if (already) return { ok: false, reason: "ALREADY_OWNED" };

  const paid = await grantStar({
    childId,
    triggerCode: "WARDROBE_SPEND",
    delta: -item.cost,
    idempotencyKey: `buy:${childId}:${itemId}`,
  });
  if (!paid.ok) return { ok: false, reason: "NOT_ENOUGH" };

  await prisma.childItem.upsert({
    where: { childId_itemId: { childId, itemId } },
    create: { childId, itemId, cost: item.cost },
    update: {},
  });

  // 산 즉시 입힌다 — 산 게 어디 갔는지 아이가 찾아다니지 않게
  if (item.placement.kind === "avatar") await equipCharacter(childId, itemId);
  if (item.placement.kind === "socket") await toggleWear(childId, itemId, true);

  return { ok: true, duplicated: paid.duplicated };
}

async function ensureRoom(childId: string) {
  await prisma.childRoom.upsert({ where: { childId }, create: { childId }, update: {} });
}

/** 캐릭터를 바꾼다 — 한 번에 하나만 입는다 */
export async function equipCharacter(childId: string, itemId: string) {
  const item = findItem(itemId);
  if (!item || item.placement.kind !== "avatar") return false;
  const { owned } = await getRoom(childId);
  if (!owned.includes(itemId)) return false;

  await ensureRoom(childId);
  await prisma.childRoom.update({ where: { childId }, data: { characterId: itemId } });
  return true;
}

/** 모자·안경·가방을 쓰고 벗는다 */
export async function toggleWear(childId: string, itemId: string, on?: boolean) {
  const item = findItem(itemId);
  if (!item || item.placement.kind !== "socket") return false;
  const state = await getRoom(childId);
  if (!state.owned.includes(itemId)) return false;

  const has = state.wear.includes(itemId);
  const next = (on ?? !has)
    ? Array.from(new Set([...state.wear, itemId]))
    : state.wear.filter((w) => w !== itemId);

  await ensureRoom(childId);
  await prisma.childRoom.update({ where: { childId }, data: { wear: next } });
  return true;
}

/**
 * 방 배치를 저장한다.
 * 🔴 **가진 것만 저장한다.** 요청에 담긴 id 를 그대로 믿으면 안 가진 물건이 방에 남는다.
 */
export async function saveLayout(childId: string, layout: RoomState["layout"]) {
  const { owned } = await getRoom(childId);
  const clean: RoomState["layout"] = {};
  for (const [id, p] of Object.entries(layout)) {
    if (!owned.includes(id)) continue;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    clean[id] = { x: n(p?.x), z: n(p?.z), ry: n(p?.ry), y: n(p?.y) };
  }
  await ensureRoom(childId);
  await prisma.childRoom.update({ where: { childId }, data: { layout: clean } });
}
