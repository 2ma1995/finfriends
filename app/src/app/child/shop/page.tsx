import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { CATEGORIES, byCategory, findItem, type Category } from "@/contracts/items";
import { currentChild } from "@/lib/session/current-child";
import { getRoom } from "@/modules/items";
import { ShopGrid } from "./ShopGrid";
import {
  boughtNotice, consentRequired, noDevice, notice, savingHint, shortNotice,
} from "./shop.fixture";

// STR-005 — 별로 바꾸는 아이템 상점
export const metadata = { title: "상점 · 핀프렌즈" };

export default async function ChildShopPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; bought?: string; failed?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="상점" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="🛍" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const keys = CATEGORIES.map((c) => c.key);
  const raw = sp.c as Category | undefined;
  const active: Category = raw && keys.includes(raw) ? raw : "character";
  const items = byCategory(active);

  const room = await getRoom(access.childId);
  const bought = sp.bought ? findItem(sp.bought) : null;

  // 모자란 만큼을 말해 준다 — 「안 돼요」로 끝내지 않는다
  const cheapest = items.filter((i) => !room.owned.includes(i.id)).map((i) => i.cost).sort((a, b) => a - b)[0];
  const short = sp.failed === "NOT_ENOUGH" && cheapest !== undefined ? cheapest - room.stars : null;

  return (
    /* 🔴 **돌아갈 길이 없었다.** 기기가 안 열렸을 때 화면에만 `back` 이 있고
          정작 상점 본 화면에는 없어서, 들어오면 탭으로만 나갈 수 있었다 */
    <Screen role="아이 화면" title="상점" sub={`내 별 ⭐ ${room.stars}`}
            back={{ href: "/child/home", label: "내 방" }}>
      {bought ? (
        <div className="mb-2"><Card tone="grow"><p className="text-sub">{boughtNotice(bought.name)}</p></Card></div>
      ) : null}
      {short !== null && short > 0 ? (
        <div className="mb-2"><Card tone="miss"><p className="text-sub">{shortNotice(short)}</p></Card></div>
      ) : null}

      {/* 카테고리 탭 — kit 하나가 카테고리 하나다 */}
      <ul className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <li key={c.key} className="shrink-0">
            <Link href={`/child/shop?c=${c.key}`}
                  className={`flex min-h-touch items-center gap-1 rounded-card border px-3 text-sub ${
                    c.key === active ? "border-primary bg-primary-bg font-bold" : "border-line bg-surface"}`}>
              <span>{c.emoji}</span>{c.label}
            </Link>
          </li>
        ))}
      </ul>

      <ShopGrid items={items} owned={room.owned} stars={room.stars}
                characterId={room.characterId} wear={room.wear}
                back={`/child/shop?c=${active}`} />

      <div className="mt-3 grid gap-2">
        <Card tone="grow"><p className="text-sub leading-relaxed">{savingHint}</p></Card>
        <Card><p className="text-sub leading-relaxed text-ink-soft">{notice}</p></Card>
      </div>
    </Screen>
  );
}
