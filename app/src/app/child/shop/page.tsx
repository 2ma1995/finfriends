import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { CATEGORIES, byCategory, notice, savingHint, type Category } from "./shop.fixture";
import { ShopGrid } from "./ShopGrid";

// STR-005 — 별로 바꾸는 아이템 상점
export const metadata = { title: "별로 바꾸기 · 핀프렌즈" };

export default async function ChildShopPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const keys = CATEGORIES.map((c) => c.key);
  const raw = (await searchParams).c as Category | undefined;
  const active: Category = raw && keys.includes(raw) ? raw : "character";
  const items = byCategory(active);

  return (
    <Screen role="아이 화면" title="별로 바꾸기" back={{ href: "/child/home", label: "내 방" }}>
      {/* 카테고리 탭 — kit 하나가 카테고리 하나다 */}
      <ul className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <li key={c.key} className="shrink-0">
            <Link href={`/child/shop?c=${c.key}`}
                  className={`flex min-h-touch items-center gap-1 rounded-card border px-3 text-[0.82em] ${
                    c.key === active ? "border-primary bg-primary-bg font-bold" : "border-line bg-surface"}`}>
              <span>{c.emoji}</span>{c.label}
            </Link>
          </li>
        ))}
      </ul>

      <ShopGrid items={items} />

      <div className="mt-3 grid gap-2">
        <Card tone="grow"><p className="text-[0.84em] leading-relaxed">{savingHint}</p></Card>
        <Card><p className="text-[0.82em] leading-relaxed text-ink-soft">{notice}</p></Card>
      </div>
    </Screen>
  );
}
