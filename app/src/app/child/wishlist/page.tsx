import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getWishlist, MAX_DEPOSIT, MAX_TARGET, MAX_WISHES, MIN_TARGET } from "@/modules/wishlist";
import { addWishAction, depositAction, raiseRankAction, removeWishAction } from "@/app/actions/wishlist";
import {
  addLabel, addTitle, addedNotice, consentRequired, depositLabel, depositPlaceholder,
  empty, errors, milestoneHint, nameLabel, namePlaceholder, noDevice, rankNotice,
  rankUpLabel, rankedNotice, removeLabel, savedNotice, targetLabel, targetPlaceholder,
} from "./wishlist.fixture";

// PRC-004 — 위시리스트. 🔴 목이 아니라 DB 를 본다
export const metadata = { title: "갖고 싶은 것 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildWishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; saved?: string; ranked?: string; error?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="갖고 싶은 것" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="🎁" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const { wishes, rankChangesLeft } = await getWishlist(access.childId);
  const full = wishes.length >= MAX_WISHES;

  return (
    <Screen role="아이 화면" title="갖고 싶은 것" sub={`${wishes.length} / ${MAX_WISHES}개`}
            back={{ href: "/child/home", label: "내 방" }}>
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}
      {sp.added || sp.saved || sp.ranked ? (
        <div className="mb-2"><Card tone="grow">
          <p className="text-[0.88em]">{sp.added ? addedNotice : sp.saved ? savedNotice : rankedNotice}</p>
        </Card></div>
      ) : null}

      {wishes.length === 0 ? <Empty emoji="🎁" {...empty} /> : (
        <ul className="grid gap-2">
          {wishes.map((w, i) => (
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

              {/* 🔴 모은 돈은 아이가 스스로 적는다 — 용돈기입장과 같다. 한 번 상한은 모듈이 건다 */}
              <form action={depositAction} className="mt-2 flex gap-1.5">
                <input type="hidden" name="wishId" value={w.id} />
                <input name="amount" type="number" inputMode="numeric" min={1} max={MAX_DEPOSIT} step={1}
                       required placeholder={depositPlaceholder}
                       className="min-h-touch w-full flex-1 rounded-card border border-line bg-surface px-3 text-right text-[0.9em] tabular-nums" />
                <button className="min-h-touch shrink-0 rounded-card bg-primary px-3 text-[0.8em] font-bold text-white">
                  {depositLabel}
                </button>
              </form>

              <div className="mt-1.5 flex gap-1.5">
                {i > 0 && rankChangesLeft > 0 ? (
                  <form action={raiseRankAction} className="flex-1">
                    <input type="hidden" name="wishId" value={w.id} />
                    <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.76em] text-ink-soft">
                      {rankUpLabel}
                    </button>
                  </form>
                ) : null}
                <form action={removeWishAction} className="flex-1">
                  <input type="hidden" name="wishId" value={w.id} />
                  <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.76em] text-ink-mute">
                    {removeLabel}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 🔴 이 폼이 없어서 화면이 읽기 전용이었다. 학습은 「여기 적어 두세요」라고 안내하는데 적을 데가 없었다 */}
      {!full ? (
        <div className="mt-3 rounded-card border border-line bg-surface p-3">
          <h2 className="text-[0.82em] font-bold">{addTitle}</h2>
          <form action={addWishAction} className="mt-2 grid gap-2">
            <label className="grid gap-1">
              <span className="text-[0.74em] text-ink-mute">{nameLabel}</span>
              <input name="name" required maxLength={30} placeholder={namePlaceholder}
                     className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.9em]" />
            </label>
            <label className="grid gap-1">
              <span className="text-[0.74em] text-ink-mute">{targetLabel}</span>
              <input name="targetAmount" type="number" inputMode="numeric"
                     min={MIN_TARGET} max={MAX_TARGET} step={1} required placeholder={targetPlaceholder}
                     className="min-h-touch rounded-card border border-line bg-surface px-3 text-right text-[0.92em] font-bold tabular-nums" />
            </label>
            <button className="min-h-touch w-full rounded-card bg-primary text-[0.88em] font-bold text-white">
              {addLabel}
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-3 text-center text-[0.76em] text-ink-mute">{errors.TOO_MANY}</p>
      )}

      <p className="mt-2 text-center text-[0.74em] text-ink-mute">{milestoneHint}</p>
      <p className="mt-1 text-center text-[0.74em] text-ink-mute">{rankNotice(rankChangesLeft)}</p>
    </Screen>
  );
}
