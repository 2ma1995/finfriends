import { Screen, Card, Empty } from "@/components/shared/Screen";
import { AddModal } from "@/components/child/AddModal";
import { currentChild } from "@/lib/session/current-child";
import { getWishlist, MAX_WISHES } from "@/modules/wishlist";
import { getBalance } from "@/modules/allowance";
import { addWishAction, depositAction, raiseRankAction, removeWishAction } from "@/app/actions/wishlist";
import {
  addLabel, addOpenLabel, addTitle, addedNotice, closeLabel, consentRequired,
  depositLabel, depositPlaceholder,
  empty, errors, milestoneHint, nameLabel, namePlaceholder, noDevice, rankNotice, reachedLabel, remainingLabel,
  allStarsLabel, nextStarLabel, rankUpLabel, rankedNotice, removeLabel, savedNotice,
  targetLabel, targetPlaceholder,
  walletEmpty, walletLabel,
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
      <Screen title="갖고 싶은 것" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="🎁" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const [{ wishes, rankChangesLeft }, allowance] = await Promise.all([
    getWishlist(access.childId),
    getBalance(access.childId),
  ]);
  const full = wishes.length >= MAX_WISHES;

  return (
    <Screen title="갖고 싶은 것" sub={`${wishes.length} / ${MAX_WISHES}개`}
            back={{ href: "/child/home", label: "내 방" }}>
      {/* 🔴 별이 아니라 용돈이다. 여기서 떼어 목표에 넣는다 (D18) */}
      <a href="/child/allowance"
         className="mb-3 block rounded-card bg-sand px-3 py-2.5 text-center">
        <b className="text-sub">{walletLabel(allowance)}</b>
        {allowance === 0 ? <p className="mt-0.5 text-cap text-ink-mute">{walletEmpty}</p> : null}
      </a>

      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-sub">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}
      {sp.added || sp.saved || sp.ranked ? (
        <div className="mb-2"><Card tone="grow">
          <p className="text-sub">{sp.added ? addedNotice : sp.saved ? savedNotice : rankedNotice}</p>
        </Card></div>
      ) : null}

      {wishes.length === 0 ? <Empty emoji="🎁" {...empty} /> : (
        /* 🔴 **담는 상자에는 선을 안 두른다.** 배경만으로 묶인다 —
              선은 「다 모았다」·「넘겼다」 같은 상태를 말할 때만 쓴다 */
        <ul className="grid gap-2">
          {wishes.map((w, i) => (
            <li key={w.id} className="rounded-card bg-surface p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-body">{w.name}</b>
                <b className="shrink-0 tabular-nums text-sub text-ink-mute">{won(w.targetAmount)}</b>
              </div>
              <div className="text-cap text-ink-mute">{w.rank}순위</div>

              {/* 🔴 넣은 게 **0%로 보이면 안 된다.** 1,000/300,000 은 0% 로 내려간다 —
                  아이는 「넣었는데 아무 일도 안 일어났다」로 느낀다. 조금이라도 넣었으면 보인다 */}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-primary-l"
                     style={{ width: w.savedAmount > 0 ? `${Math.max(3, w.percent)}%` : "0%" }} />
              </div>

              {/* 🔴 퍼센트보다 **모은 돈과 남은 돈**이 아이에게 구체적이다 */}
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <b className="text-sub tabular-nums text-primary-d">{won(w.savedAmount)}</b>
                <span className="text-cap text-ink-mute">
                  {w.remaining > 0 ? remainingLabel(w.remaining) : reachedLabel}
                </span>
              </div>

              <div className="mt-0.5 flex justify-between text-cap text-ink-mute">
                <span />
                {/* 지난 단계는 이미 별을 받은 것 · 다음 단계는 앞으로 받을 것 */}
                {/* 🔴 아이 화면에 `%` 를 쓰지 않는다 (AC-031-5). 다음 별까지 **금액**으로 말한다 */}
                <span>
                  {w.nextMilestone
                    ? nextStarLabel(Math.max(0, Math.ceil((w.targetAmount * w.nextMilestone) / 100) - w.savedAmount))
                    : allStarsLabel}
                </span>
              </div>

              {/*
                🔴 모은 돈은 아이가 스스로 적는다 — 용돈기입장과 같다. 한 번 상한은 모듈이 건다.

                🔴 **`min`·`max`·`required` 를 걸지 않는다** (어긋남 대장 D66).
                   범위 밖 값을 넣으면 브라우저가 **조용히 막고 자기 말풍선만** 띄운다 —
                   화면은 아무 반응이 없어 아이는 「버튼이 고장 났다」고 읽는다.

                   `modules/wishlist.deposit` 이 검사한다 — 한도를 넘으면 `BAD_AMOUNT`,
                   용돈보다 많으면 `NOT_ENOUGH` 로 돌려보내고, 그 문구가 이 화면 위에 뜬다.

                🔴 `disabled` 는 남긴다 — 용돈이 0이면 **눈에 보이게** 꺼진다(`opacity-40`).
                   조용히 실패하는 것과 다르다.
                🔴 `min-w-0` — 없으면 입력칸이 자기 최소 폭 아래로 안 줄어 버튼이 밖으로 밀린다.
              */}
              <form action={depositAction} className="mt-2 flex gap-1.5">
                <input type="hidden" name="wishId" value={w.id} />
                <input name="amount" type="number" inputMode="numeric" step={1}
                       disabled={allowance <= 0} placeholder={depositPlaceholder}
                       className="min-h-touch w-full min-w-0 flex-1 rounded-card border border-line bg-surface px-3 text-right text-body tabular-nums" />
                <button disabled={allowance <= 0}
                        className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-sub font-bold text-white disabled:opacity-40">
                  {depositLabel}
                </button>
              </form>

              <div className="mt-1.5 flex gap-1.5">
                {i > 0 && rankChangesLeft > 0 ? (
                  <form action={raiseRankAction} className="flex-1">
                    <input type="hidden" name="wishId" value={w.id} />
                    <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-cap text-ink-soft">
                      {rankUpLabel}
                    </button>
                  </form>
                ) : null}
                <form action={removeWishAction} className="flex-1">
                  <input type="hidden" name="wishId" value={w.id} />
                  <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-cap text-ink-mute">
                    {removeLabel}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 🔴 이 폼이 없어서 화면이 읽기 전용이었다. 학습은 「여기 적어 두세요」라고 안내하는데 적을 데가 없었다 */}
      {/* 🔴 **폼을 접어 둔다.** 늘 펼쳐 두면 모은 돈보다 적는 칸이 더 커 보인다 */}
      {!full ? (
        <AddModal label={addOpenLabel} title={addTitle} closeLabel={closeLabel}>
          <form action={addWishAction} className="grid gap-2">
            <input type="hidden" name="from" value="wishlist" />
            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{nameLabel}</span>
              <input name="name" required maxLength={30} placeholder={namePlaceholder}
                     className="min-h-touch rounded-card border border-line bg-surface px-3 text-body" />
            </label>
            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{targetLabel}</span>
              {/* 🔴 D66 — `addWish` 가 `BAD_TARGET` 으로 거절하고
                     「1,000원부터 1,000,000원까지 적을 수 있어요.」가 이 화면에 뜬다 */}
              <input name="targetAmount" type="number" inputMode="numeric" step={1}
                     placeholder={targetPlaceholder}
                     className="min-h-touch rounded-card border border-line bg-surface px-3 text-right text-body font-bold tabular-nums" />
            </label>
            <button className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
              {addLabel}
            </button>
          </form>
        </AddModal>
      ) : (
        <p className="mt-3 text-center text-cap text-ink-mute">{errors.TOO_MANY}</p>
      )}

      <p className="mt-2 text-center text-cap text-ink-mute">{milestoneHint}</p>
      <p className="mt-1 text-center text-cap text-ink-mute">{rankNotice(rankChangesLeft)}</p>
    </Screen>
  );
}
