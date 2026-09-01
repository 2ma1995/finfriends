import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getPassbook } from "@/modules/allowance";
import { getWishlist } from "@/modules/wishlist";
import { remainingLabel, reachedLabel } from "@/app/child/wishlist/wishlist.fixture";
import {
  getClosed, getOpen, MAX_MONTHS, MAX_PERIODS, MIN_AMOUNT, MIN_PER_PERIOD, MIN_PERIODS, WANTED_CHOICES,
} from "@/modules/savings";
import { breakSavingsAction, payInstallmentAction, requestSavingsAction } from "@/app/actions/savings";
import { SavingsForm } from "@/components/child/SavingsForm";
import {
  balanceTitle, card, consentRequired, historyTitle,
  errors, noDevice, notice, savedTitle, savings,
  planLink, setAsideNotice, title, totalTitle, wishEmpty, wishRank, wishTitle,
} from "./allowance.fixture";

// D18 · D20 — 아이 통장. 🔴 두 자료가 가장 강조하는 실천이 용돈기입장 쓰기다
export const metadata = { title: "내 통장 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildPassbookPage({
  searchParams,
}: {
  searchParams: Promise<{ asked?: string; broke?: string; error?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={title} back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="📒" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const [p, open, closed, wish] = await Promise.all([
    getPassbook(access.childId, access.guardianId),
    getOpen(access.childId),
    getClosed(access.childId, 3),
    getWishlist(access.childId),
  ]);
  const stage = card[p.card];

  return (
    <Screen role="아이 화면" title={title} back={{ href: "/child/home", label: "내 방" }}>
      {/* 🔴 **가진 돈 전체가 먼저다.** 「쓸 수 있는 돈」만 크게 보이면
          목표에 떼어 둔 돈이 없어진 것처럼 보인다 — 부모 화면과 숫자가 갈리던 원인이다 */}
      {/*
        🔴 **한 덩어리는 한 상자다.** 예전엔 상자가 넷이었다 — 전체 하나에 갈래 셋.
           사실 하나의 「내 돈」인데 넷으로 쪼개져 다 같은 무게로 보였다.
           합치고 **안에서 구분선**으로 나눈다.

        🔴 **「가진 돈 전체」가 제일 크다.** 이건 안 뒤집는다 — 「쓸 수 있는 돈」만
           크게 보이면 아이가 목표에 떼어 둔 돈이 **없어진 줄** 안다.
      */}
      <div className="rounded-card bg-surface px-4 py-4">
        <b className="block text-center text-hero leading-none tabular-nums">{won(p.total)}</b>
        <div className="mt-1 text-center text-cap text-ink-mute">{totalTitle}</div>

        {/* 갈래는 **선 하나로** 나눈다. 상자를 또 만들지 않는다 */}
        <dl className="mt-3 grid gap-1.5 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-sub text-ink-soft">{balanceTitle}</dt>
            <dd className="text-body font-bold tabular-nums">{won(p.balance)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-sub text-ink-soft">{savedTitle}</dt>
            <dd className="text-body font-bold tabular-nums">{won(p.savedWon)}</dd>
          </div>
          {p.locked > 0 ? (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-sub text-ink-soft">{savings.lockedTitle}</dt>
              <dd className="text-body font-bold tabular-nums text-primary-d">{won(p.locked)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      {p.savedWon > 0 ? (
        <p className="mt-1.5 text-center text-cap text-ink-mute">{setAsideNotice}</p>
      ) : null}

      {/* 🔴 카드가 언제 오는지 아이가 알아야 한다 (UX-006 배송 대기) */}
      {/* 🔴 **읽는 것은 테두리를 안 두른다.** 누를 수 없는데 눌리게 생기면 아이가 눌러 본다 */}
      <div className="mt-3 flex items-center gap-2.5 px-1">
        <span className="text-[1.5em]">{stage.emoji}</span>
        <span className="flex-1">
          <b className="block text-sub">{stage.label}</b>
          <span className="text-cap text-ink-mute">{stage.body}</span>
        </span>
      </div>

      {/* 🔴 **봉투가 있던 자리다** (D41). 소비를 적고 맞춰보는 곳은 계획 카드 하나다 —
          돈 화면에서 그리로 가는 길이 없으면 아이가 못 찾는다 */}
      {/* 🔴 **누르는 것은 배경을 깐다.** 읽는 것과 같은 모양이면 눌러 봐야 안다 */}
      <Link href="/child/plan"
            className="mt-3 flex min-h-touch items-center gap-2.5 rounded-card bg-surface px-3.5">
        <span className="text-[1.3em]">📝</span>
        <span className="flex-1 text-body font-bold">{planLink.label}</span>
        <span className="text-cap text-ink-mute">{planLink.hint} ›</span>
      </Link>

      {/* 🔴 「불리기」 실천을 여는 유일한 길 — SAVINGS_JOINED · SAVINGS_DONE (D25).
          은행 적금이 아니라 부모님과 하는 약속이다 (P-20 가입 중개 금지) */}
      {/* 🔴 **구역 제목은 한 크기다.** `sub`·`title`·`cap` 이 섞여 있었다 —
             같은 자리인데 크기가 다르면 아이는 어느 게 더 중요한지로 읽는다 */}
      <h2 className="mb-2 mt-7 text-title font-bold leading-none">{savings.title}</h2>
      {sp.error ? (
        <div className="mb-1.5"><Card tone="miss">
          <p className="text-sub">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}
      {sp.asked || sp.broke ? (
        <div className="mb-1.5"><Card tone="grow">
          <p className="text-sub">{sp.asked ? savings.askedNotice : savings.brokeNotice}</p>
        </Card></div>
      ) : null}

      {/* 🔴 반려는 끝이 아니다. 「거절」을 쓰지 않고 다시 이야기할 자리를 연다 (AC-031-4) */}
      {open === null && closed[0]?.state === "REJECTED" ? (
        <div className="mb-1.5 rounded-card border border-miss-line bg-miss-bg p-3">
          <b className="text-sub text-miss">{savings.talkAgain}</b>
          {closed[0].rejectReason ? (
            <p className="mt-1 text-sub leading-relaxed">{closed[0].rejectReason}</p>
          ) : null}
          <p className="mt-1 text-sub text-ink-soft">{savings.talkAgainBody}</p>
        </div>
      ) : null}

      {open === null ? (
        <div className="rounded-card bg-surface p-3.5">
          <p className="text-sub leading-relaxed">{savings.what}</p>
          <p className="mt-1 text-cap text-ink-mute">{savings.notBank}</p>

          {/* 🔴 이자율이 아직 없어도 신청할 수 있다. 막으면 새 집은 영영 신청을 못 한다 —
              이자를 정하는 자리가 「받아들이기」로 옮겨졌기 때문이다 */}
          {p.interestPct === null ? (
            <p className="mt-2 text-sub text-ink-mute">{savings.rateLater}</p>
          ) : null}
          <SavingsForm
            action={requestSavingsAction}
            choices={WANTED_CHOICES}
            houseRate={p.interestPct}
            balance={p.balance}
            limits={{
              minPerPeriod: MIN_PER_PERIOD, minPeriods: MIN_PERIODS, maxPeriods: MAX_PERIODS,
              minAmount: MIN_AMOUNT, maxMonths: MAX_MONTHS,
            }}
            copy={{
              goalLabel: savings.goalLabel, goalPlaceholder: savings.goalPlaceholder,
              kindLabel: savings.kindLabel, kinds: savings.kinds,
              perPeriodLabel: savings.perPeriodLabel, periodsLabel: savings.periodsLabel,
              amountLabel: savings.amountLabel, monthsLabel: savings.monthsLabel,
              totalPreview: savings.totalPreview, depositPreview: savings.depositPreview,
              wantLabel: savings.wantLabel, wantWho: savings.wantWho,
              interestPreview: savings.interestPreview, noInterest: savings.noInterest,
              ask: savings.ask,
            }}
          />
        </div>
      ) : (
        <div className={`rounded-card border p-3 ${
          open.state === "REQUESTED" ? "border-star bg-star-bg" : "border-primary-l bg-primary-bg"}`}>
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-body">{open.goal}</b>
            <b className="shrink-0 tabular-nums text-body">{won(open.amount)}</b>
          </div>
          <p className="mt-0.5 text-cap text-ink-mute">
            {open.kind === "INSTALLMENT"
              ? `${savings.kinds.INSTALLMENT.label} · 한 주 ${won(open.perPeriod ?? 0)}`
              : `${savings.kinds.DEPOSIT.label} · ${open.months}달`}
          </p>
          {/* 🔴 바란 것과 다르면 그 사실을 말한다. 조용히 넘기면 「왜 물어봤지」가 된다 */}
          {open.wantedPct !== null ? (
            <p className={`mt-0.5 text-cap ${open.differs ? "text-star-d" : "text-primary-d"}`}>
              {/* 🔴 바란 것도 받은 것도 **금액**으로 말한다. 아이는 퍼센트를 못 읽는다 */}
              {open.state === "REQUESTED"
                ? savings.wantedShown(Math.floor((open.amount * open.wantedPct) / 100))
                : open.differs ? savings.gaveInstead(open.interestWon) : savings.sameAsWanted}
            </p>
          ) : null}

          {open.state === "REQUESTED" ? (
            <p className="mt-1.5 text-sub text-ink-soft">
              {savings.waiting} · {savings.waitingBody}
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-sub font-bold text-primary-d">
                {open.matured ? savings.matured : savings.active(open.daysLeft ?? 0)}
              </p>
              <p className="mt-0.5 text-sub text-star-d">
                {open.interestWon > 0 ? savings.willGet(open.interestWon) : savings.noInterest}
              </p>
              {/* 🔴 적금은 아이가 매주 직접 넣는다. 자동이면 실천이 아니다 */}
              {open.kind === "INSTALLMENT" ? (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-primary-l"
                         style={{ width: `${(open.paidCount / (open.periods || 1)) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-cap text-ink-mute">
                    {savings.progress(open.paidCount, open.periods ?? 0)} · {won(open.paidSoFar)} 모음
                  </p>
                  {open.fullyPaid ? (
                    <p className="mt-1 text-sub font-bold text-primary-d">{savings.allPaid}</p>
                  ) : open.paidThisWeek ? (
                    <p className="mt-1 text-sub text-ink-soft">{savings.paidThisWeek}</p>
                  ) : (
                    <form action={payInstallmentAction} className="mt-1.5">
                      <input type="hidden" name="planId" value={open.id} />
                      <button className="min-h-touch w-full rounded-card bg-primary text-sub font-bold text-white">
                        {savings.payLabel(open.perPeriod ?? 0)}
                      </button>
                      <p className="mt-1 text-cap text-ink-mute">{savings.skipOk}</p>
                    </form>
                  )}
                </div>
              ) : null}

              {/* 🔴 깨는 것을 막지 않는다. 아이 돈이다. 대신 대가를 먼저 말한다 */}
              {!open.matured ? (
                <form action={breakSavingsAction} className="mt-2">
                  <input type="hidden" name="planId" value={open.id} />
                  <p className="mb-1 text-cap text-miss">{savings.breakWarn}</p>
                  <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-sub text-ink-soft">
                    {savings.breakLabel}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* 🔴 **끝난 저금은 딴 화면이다.** 여기 붙으면 「지금 하는 저금」이 그 아래 묻힌다 */}
      {closed.length > 0 ? (
        <Link href="/child/allowance/savings"
              className="mt-1.5 flex min-h-touch items-center gap-2.5 rounded-card bg-surface px-3.5">
          <span className="text-[1.1em]">🐖</span>
          <span className="flex-1 text-sub">{savings.pastLink}</span>
          <span className="text-cap tabular-nums text-ink-mute">{closed.length}건 ›</span>
        </Link>
      ) : null}

      {/*
        🔴 **목표가 내역보다 먼저다.** 통장을 여는 이유는 「얼마 남았지」이지
           「지난달에 뭘 샀지」가 아니다. 내역은 지나간 것이고 목표는 앞으로 올 것이다.
        🔴 **여기서 돈을 넣지 않는다.** 넣는 자리는 「갖고 싶은 것」 화면 하나다 —
           두 군데서 넣으면 한도와 별 판정이 두 경로로 갈린다.
      */}
      <h2 className="mb-2 mt-7 text-title font-bold leading-none">{wishTitle}</h2>
      {wish.wishes.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 px-3 py-2.5 text-center text-cap text-ink-mute">
          {wishEmpty}
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {wish.wishes.map((w) => (
            <li key={w.id}>
              <Link href="/child/wishlist"
                    className="block rounded-card bg-surface px-3.5 py-2.5">
                <span className="flex items-baseline justify-between gap-2">
                  <b className="truncate text-sub">{w.name}</b>
                  <span className="shrink-0 text-cap text-ink-mute">{wishRank(w.rank)}</span>
                </span>

                {/* 🔴 넣은 게 **0%로 보이면 안 된다.** 1,000/300,000 은 0% 로 내려가고
                    아이는 「넣었는데 아무 일도 안 일어났다」로 느낀다 */}
                <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-primary-l"
                        style={{ width: w.savedAmount > 0 ? `${Math.max(3, w.percent)}%` : "0%" }} />
                </span>

                {/* 🔴 아이 화면에 `%` 를 쓰지 않는다 (AC-031-5). 남은 것을 **금액**으로 말한다 */}
                <span className="mt-1 flex items-baseline justify-between gap-2">
                  <b className="text-sub tabular-nums text-primary-d">{won(w.savedAmount)}</b>
                  <span className="text-cap text-ink-mute">
                    {w.remaining > 0 ? remainingLabel(w.remaining) : reachedLabel}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 🔴 **지난 기록은 딴 화면이다.** 30줄이 여기 붙으면 스크롤이 기록으로 끝나고
             목표도 저금도 그 밑에 묻힌다 — 기록을 줄인 게 아니라 자리를 옮겼다 */}
      <Link href="/child/allowance/history"
            className="mt-7 flex min-h-touch items-center gap-2.5 rounded-card bg-surface px-3.5">
        <span className="text-[1.1em]">📒</span>
        <span className="flex-1 text-sub font-bold">{historyTitle}</span>
        <span className="text-cap tabular-nums text-ink-mute">
          {p.history.length > 0 ? `${p.history.length}건 ›` : "›"}
        </span>
      </Link>

      <div className="mt-3"><Card tone="grow"><p className="text-sub leading-relaxed">{notice}</p></Card></div>
    </Screen>
  );
}
