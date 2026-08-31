import Image from "next/image";
import type { Item } from "@/contracts/items";
import { buyItemAction, equipAction } from "@/app/actions/items";
import { buyLabel, equipLabel, lockedHint, ownedLabel, unequipLabel, wearingLabel } from "./shop.fixture";

/**
 * 상점 격자 — 서버가 그린다. 🔴 보유·잔액은 DB 가 안다.
 * 🔴 **못 사는 것은 회색으로 둔다.** 숨기면 아이가 목표를 못 세운다 (사용자 결정).
 */
export function ShopGrid({ items, owned, stars, characterId, wear, back }: {
  items: readonly Item[];
  owned: readonly string[];
  stars: number;
  characterId: string;
  wear: readonly string[];
  back: string;
}) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-2">
      {items.map((i) => {
        const has = owned.includes(i.id);
        const equipped =
          i.placement.kind === "avatar" ? characterId === i.id
          : i.placement.kind === "socket" ? wear.includes(i.id)
          : has;
        const canBuy = has || stars >= i.cost;
        const equippable = has && (i.placement.kind === "avatar" || i.placement.kind === "socket");

        return (
          <li key={i.id}
              className={`rounded-card border p-2 ${
                equipped ? "border-primary bg-primary-bg"
                : has ? "border-line bg-surface"
                : "border-line bg-surface"}`}>
            {/* 🔴 못 사는 것은 회색 + 자물쇠. 숨기지 않는다 */}
            <div className={`grid h-[86px] place-items-center rounded-card bg-sand ${
              canBuy ? "" : "opacity-40 grayscale"}`}>
              {i.thumb ? (
                <Image src={i.thumb} alt="" width={64} height={64} className="h-16 w-16 object-contain" />
              ) : (
                <span className="text-[2em]">{i.category === "wear" ? "🧢" : "📦"}</span>
              )}
            </div>

            <div className="mt-1.5 flex items-baseline justify-between gap-1">
              <b className={`text-[0.82em] ${canBuy ? "" : "text-ink-mute"}`}>{i.name}</b>
              {has ? (
                <span className="shrink-0 text-[0.7em] text-primary-d">
                  {equipped ? wearingLabel : ownedLabel}
                </span>
              ) : (
                <span className={`shrink-0 text-[0.74em] tabular-nums ${canBuy ? "text-star-d" : "text-ink-mute"}`}>
                  {canBuy ? "" : "🔒 "}⭐ {i.cost}
                </span>
              )}
            </div>

            {equippable ? (
              <form action={equipAction} className="mt-1.5">
                <input type="hidden" name="itemId" value={i.id} />
                <input type="hidden" name="kind" value={i.placement.kind} />
                <input type="hidden" name="back" value={back} />
                <button className={`min-h-touch w-full rounded-card text-[0.78em] font-bold ${
                  equipped ? "border border-line-2 bg-surface text-ink-soft" : "bg-primary text-white"}`}>
                  {equipped ? unequipLabel : equipLabel}
                </button>
              </form>
            ) : has ? (
              <p className="mt-1.5 grid min-h-touch place-items-center text-[0.74em] text-ink-mute">방에 있어요</p>
            ) : canBuy ? (
              <form action={buyItemAction} className="mt-1.5">
                <input type="hidden" name="itemId" value={i.id} />
                <input type="hidden" name="back" value={back} />
                <button className="min-h-touch w-full rounded-card bg-primary text-[0.78em] font-bold text-white">
                  {buyLabel}
                </button>
              </form>
            ) : (
              <p className="mt-1.5 grid min-h-touch place-items-center text-[0.74em] text-ink-mute">{lockedHint}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
