import { Screen } from "@/components/shared/Screen";
import { wishes, MILESTONES, rankChangeLeft } from "./wishlist.fixture";

// PRC-004 — 위시리스트
export const metadata = { title: "갖고 싶은 것 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function ChildWishlistPage() {
  return (
    <Screen role="아이 화면" title="갖고 싶은 것" back={{ href: "/child/home", label: "내 방" }}>
      <ul className="grid gap-2">
        {wishes.map((w) => {
          const pct = Math.min(100, Math.round((w.saved / w.price) * 100));
          const reached = MILESTONES.filter((m) => pct >= m);
          return (
            <li key={w.id} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="text-[1.6em]">{w.emoji}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.92em]">{w.name}</b>
                  <span className="text-[0.74em] text-ink-mute">{w.rank}순위 · {won(w.price)}</span>
                </span>
                <b className="tabular-nums text-[0.92em] text-primary-d">{pct}%</b>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-primary-l" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[0.72em] text-ink-mute">
                <span>모은 돈 {won(w.saved)}</span>
                <span>{reached.length > 0 ? `${reached.join("·")}% 지남` : `${MILESTONES[0]}%까지 조금 더`}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-[0.74em] text-ink-mute">순위 바꾸기는 이번 달 {rankChangeLeft}번 남았어요</p>
    </Screen>
  );
}
