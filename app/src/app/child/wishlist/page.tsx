import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getWishlist } from "@/modules/wishlist";
import { consentRequired, empty, noDevice, rankNotice } from "./wishlist.fixture";

// PRC-004 — 위시리스트. 🔴 목이 아니라 DB 를 본다
export const metadata = { title: "갖고 싶은 것 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildWishlistPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="갖고 싶은 것" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="🎯" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const { wishes, rankChangesLeft } = await getWishlist(access.childId);

  return (
    <Screen role="아이 화면" title="갖고 싶은 것" back={{ href: "/child/home", label: "내 방" }}>
      {wishes.length === 0 ? (
        <Empty emoji="🎯" {...empty} />
      ) : (
        <ul className="grid gap-2">
          {wishes.map((w) => (
            <li key={w.id} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-[0.92em]">{w.name}</b>
                <b className="shrink-0 tabular-nums text-[0.92em] text-primary-d">{w.percent}%</b>
              </div>
              <div className="text-[0.74em] text-ink-mute">{w.rank}순위 · {won(w.targetAmount)}</div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-primary-l" style={{ width: `${w.percent}%` }} />
              </div>

              <div className="mt-1 flex justify-between text-[0.72em] text-ink-mute">
                <span>모은 돈 {won(w.savedAmount)}</span>
                {/* 지난 단계는 이미 별을 받은 것 · 다음 단계는 앞으로 받을 것 */}
                <span>
                  {w.reached.length > 0 ? `${w.reached.join("·")}% 지남` : null}
                  {w.reached.length > 0 && w.nextMilestone ? " · " : null}
                  {w.nextMilestone ? `${w.nextMilestone}%까지 조금 더` : null}
                  {!w.nextMilestone ? " 다 모았어요" : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-center text-[0.74em] text-ink-mute">{rankNotice(rankChangesLeft)}</p>
    </Screen>
  );
}
