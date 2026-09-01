import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getPassbook, MOVED_CODES } from "@/modules/allowance";
import { getBoard, recentSpends } from "@/modules/envelope";
import { getUnmatched } from "@/modules/card";
import { allocateAction, settleAction } from "@/app/actions/envelope";
import {
  getClosed, getOpen, MAX_MONTHS, MAX_PERIODS, MIN_AMOUNT, MIN_PER_PERIOD, MIN_PERIODS, WANTED_CHOICES,
} from "@/modules/savings";
import { breakSavingsAction, payInstallmentAction, requestSavingsAction } from "@/app/actions/savings";
import { SavingsForm } from "@/components/child/SavingsForm";
import {
  balanceTitle, card, consentRequired, empty, historyTitle, inLabel,
  errors, movedLabel, noDevice, notice, outLabel, savedTitle, savings,
  envelope, setAsideNotice, title, totalTitle,
} from "./allowance.fixture";

// D18 · D20 — 아이 통장. 🔴 두 자료가 가장 강조하는 실천이 용돈기입장 쓰기다
export const metadata = { title: "내 통장 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildPassbookPage({
  searchParams,
}: {
  searchParams: Promise<{ asked?: string; broke?: string; error?: string;
                          saved?: string; spent?: string; over?: string }>;
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
  const [p, open, closed, board, txns, spends] = await Promise.all([
    getPassbook(access.childId, access.guardianId),
    getOpen(access.childId),
    getClosed(access.childId, 3),
    getBoard(access.childId),
    getUnmatched(access.childId, 4),
    recentSpends(access.childId, 6),
  ]);
  const stage = card[p.card];

  return (
    <Screen role="아이 화면" title={title} back={{ href: "/child/home", label: "내 방" }}>
      {/* 🔴 **가진 돈 전체가 먼저다.** 「쓸 수 있는 돈」만 크게 보이면
          목표에 떼어 둔 돈이 없어진 것처럼 보인다 — 부모 화면과 숫자가 갈리던 원인이다 */}
      <div className="rounded-card border border-line bg-surface px-3 py-3 text-center">
        <div className="text-[0.74em] text-ink-mute">{totalTitle}</div>
        <b className="mt-0.5 block text-title tabular-nums">{won(p.total)}</b>
      </div>

      {/* 🔴 봉투에 담은 돈은 **「쓸 수 있는 돈」 안에** 있다. 따로 더하면 두 번 센다 —
          담아 둔 몫만 옆에 갈라 보여준다 */}
      <div className={`mt-1.5 grid gap-1.5 ${p.locked > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-card border border-line bg-surface px-2 py-2 text-center">
          <div className="text-[0.68em] text-ink-mute">{balanceTitle}</div>
          <b className="mt-0.5 block text-[0.98em] tabular-nums">{won(p.balance)}</b>
          {board.allocatedTotal > 0 ? (
            <div className="text-[0.62em] text-ink-mute">봉투에 {won(board.allocatedTotal)}</div>
          ) : null}
        </div>
        <div className="rounded-card border border-line bg-sand px-2 py-2 text-center">
          <div className="text-[0.68em] text-ink-mute">{savedTitle}</div>
          <b className="mt-0.5 block text-[0.98em] tabular-nums">{won(p.savedWon)}</b>
        </div>
        {p.locked > 0 ? (
          <div className="rounded-card border border-primary-l bg-primary-bg px-2 py-2 text-center">
            <div className="text-[0.68em] text-ink-mute">{savings.lockedTitle}</div>
            <b className="mt-0.5 block text-[0.98em] tabular-nums">{won(p.locked)}</b>
          </div>
        ) : null}
      </div>
      {p.savedWon > 0 ? (
        <p className="mt-1 text-center text-[0.74em] text-ink-mute">{setAsideNotice}</p>
      ) : null}

      {/* 🔴 카드가 언제 오는지 아이가 알아야 한다 (UX-006 배송 대기) */}
      <div className="mt-2 flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2.5">
        <span className="text-[1.5em]">{stage.emoji}</span>
        <span className="flex-1">
          <b className="block text-[0.86em]">{stage.label}</b>
          <span className="text-[0.74em] text-ink-mute">{stage.body}</span>
        </span>
      </div>

      {/* 🔴 **돈 화면은 여기 하나다.** 봉투를 따로 두면 아이가 돈을 네 군데서 찾아야 한다 */}
      <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{envelope.title}</h2>
      <p className="mb-1.5 text-[0.74em] text-ink-mute">
        {board.unallocated > 0 ? envelope.unallocated(board.unallocated) : envelope.allDone}
      </p>

      {sp.saved || sp.spent ? (
        <div className="mb-1.5"><Card tone="grow">
          <p className="text-[0.86em]">{sp.saved ? envelope.saved : envelope.spent}</p>
        </Card></div>
      ) : null}
      {/* 🔴 넘긴 것을 벌처럼 말하지 않는다. 결제는 됐다는 사실을 함께 말한다 (AC-021-2) */}
      {sp.over ? (
        <div className="mb-1.5"><Card tone="miss">
          <p className="text-[0.86em]">{envelope.overNotice(Number(sp.over))}</p>
          <p className="mt-1 text-[0.84em] text-ink-soft">{envelope.overAsk}</p>
        </Card></div>
      ) : null}
      {sp.error && envelope.errors[sp.error] ? (
        <div className="mb-1.5"><Card tone="miss">
          <p className="text-[0.86em]">{envelope.errors[sp.error]}</p>
        </Card></div>
      ) : null}

      {/* 🔴 합계가 쓸 수 있는 돈을 넘으면 저장이 거부된다 (AC-020-1) */}
      <form action={allocateAction} className="grid gap-1.5">
        {board.envelopes.map((e) => (
          <div key={e.id} className={`rounded-card border p-2.5 ${
            e.overBy > 0 ? "border-miss-line bg-miss-bg" : "border-line bg-surface"}`}>
            <div className="flex items-center gap-2">
              <span className="text-[1.2em]">{e.emoji}</span>
              <b className="flex-1 text-[0.86em]">{e.name}</b>
              <label className="flex items-center gap-1">
                <input name={`env:${e.id}`} type="number" inputMode="numeric" min={0} step={100}
                       defaultValue={e.allocated}
                       className="min-h-touch w-24 rounded-card border border-line bg-surface px-2 text-right text-[0.88em] tabular-nums" />
                <span className="text-[0.78em] text-ink-mute">원</span>
              </label>
            </div>
            <p className={`mt-1 text-[0.74em] ${e.overBy > 0 ? "text-miss" : "text-ink-mute"}`}>
              {e.overBy > 0 ? envelope.over(e.overBy) : envelope.remaining(e.remaining)}
              {e.spent > 0 ? ` · 쓴 돈 ${won(e.spent)}` : ""}
            </p>
          </div>
        ))}
        <button className="min-h-touch w-full rounded-card bg-primary text-[0.88em] font-bold text-white">
          {envelope.save}
        </button>
      </form>

      {/* 🔴 실제 웹훅이 없다. 예시 거래로 흐름을 세우고 그 사실을 밝힌다 */}
      {txns.length > 0 ? (
        <>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-[0.8em] font-bold">{envelope.mockTitle}</h3>
            <span className="text-[0.66em] text-ink-mute">{envelope.mockBadge}</span>
          </div>
          <ul className="mt-1 grid gap-1">
            {txns.map((t) => (
              <li key={t.id}>
                <form action={settleAction}>
                  <input type="hidden" name="txnId" value={t.id} />
                  <button className="flex min-h-touch w-full items-center gap-2 rounded-card border border-line bg-surface px-2 text-left">
                    <span className="text-[1.1em]">{t.icon}</span>
                    <span className="flex-1 text-[0.78em]">{t.merchant}</span>
                    <b className="tabular-nums text-[0.8em]">{won(t.amount)}</b>
                    <span className="shrink-0 text-[0.7em] text-primary-d">{envelope.settle}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {spends.length > 0 ? (
        <>
          <h3 className="mb-1 mt-3 text-[0.8em] font-bold">{envelope.spentTitle}</h3>
          <ul className="grid gap-1">
            {spends.map((v) => (
              <li key={v.id} className={`flex items-center gap-2 rounded-card border px-3 py-2 ${
                v.within ? "border-line bg-surface" : "border-miss-line bg-miss-bg"}`}>
                <span className="flex-1">
                  <b className="block text-[0.82em]">{v.envelopeEmoji} {v.merchant}</b>
                  <span className="text-[0.7em] text-ink-mute">
                    {v.envelopeName}{v.unclassified ? ` · ${envelope.unclassified}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-[0.7em] ${v.within ? "text-primary-d" : "text-miss"}`}>
                  {v.within ? envelope.within : `${envelope.overBadge} ${won(v.overBy)}`}
                </span>
                <b className="shrink-0 tabular-nums text-[0.82em]">{won(v.amount)}</b>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-1.5 text-[0.74em] leading-relaxed text-ink-mute">{envelope.notice}</p>

      {/* 🔴 「불리기」 실천을 여는 유일한 길 — SAVINGS_JOINED · SAVINGS_DONE (D25).
          은행 적금이 아니라 부모님과 하는 약속이다 (P-20 가입 중개 금지) */}
      <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{savings.title}</h2>
      {sp.error ? (
        <div className="mb-1.5"><Card tone="miss">
          <p className="text-[0.86em]">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}
      {sp.asked || sp.broke ? (
        <div className="mb-1.5"><Card tone="grow">
          <p className="text-[0.86em]">{sp.asked ? savings.askedNotice : savings.brokeNotice}</p>
        </Card></div>
      ) : null}

      {/* 🔴 반려는 끝이 아니다. 「거절」을 쓰지 않고 다시 이야기할 자리를 연다 (AC-031-4) */}
      {open === null && closed[0]?.state === "REJECTED" ? (
        <div className="mb-1.5 rounded-card border border-miss-line bg-miss-bg p-3">
          <b className="text-[0.88em] text-miss">{savings.talkAgain}</b>
          {closed[0].rejectReason ? (
            <p className="mt-1 text-[0.84em] leading-relaxed">{closed[0].rejectReason}</p>
          ) : null}
          <p className="mt-1 text-[0.8em] text-ink-soft">{savings.talkAgainBody}</p>
        </div>
      ) : null}

      {open === null ? (
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-[0.86em] leading-relaxed">{savings.what}</p>
          <p className="mt-1 text-[0.74em] text-ink-mute">{savings.notBank}</p>

          {/* 🔴 이자율이 아직 없어도 신청할 수 있다. 막으면 새 집은 영영 신청을 못 한다 —
              이자를 정하는 자리가 「받아들이기」로 옮겨졌기 때문이다 */}
          {p.interestPct === null ? (
            <p className="mt-2 text-[0.8em] text-ink-mute">{savings.rateLater}</p>
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
            <b className="text-[0.9em]">{open.goal}</b>
            <b className="shrink-0 tabular-nums text-[0.9em]">{won(open.amount)}</b>
          </div>
          <p className="mt-0.5 text-[0.74em] text-ink-mute">
            {open.kind === "INSTALLMENT"
              ? `${savings.kinds.INSTALLMENT.label} · 한 주 ${won(open.perPeriod ?? 0)}`
              : `${savings.kinds.DEPOSIT.label} · ${open.months}달`}
          </p>
          {/* 🔴 바란 것과 다르면 그 사실을 말한다. 조용히 넘기면 「왜 물어봤지」가 된다 */}
          {open.wantedPct !== null ? (
            <p className={`mt-0.5 text-[0.74em] ${open.differs ? "text-star-d" : "text-primary-d"}`}>
              {/* 🔴 바란 것도 받은 것도 **금액**으로 말한다. 아이는 퍼센트를 못 읽는다 */}
              {open.state === "REQUESTED"
                ? savings.wantedShown(Math.floor((open.amount * open.wantedPct) / 100))
                : open.differs ? savings.gaveInstead(open.interestWon) : savings.sameAsWanted}
            </p>
          ) : null}

          {open.state === "REQUESTED" ? (
            <p className="mt-1.5 text-[0.84em] text-ink-soft">
              {savings.waiting} · {savings.waitingBody}
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-[0.86em] font-bold text-primary-d">
                {open.matured ? savings.matured : savings.active(open.daysLeft ?? 0)}
              </p>
              <p className="mt-0.5 text-[0.82em] text-star-d">
                {open.interestWon > 0 ? savings.willGet(open.interestWon) : savings.noInterest}
              </p>
              {/* 🔴 적금은 아이가 매주 직접 넣는다. 자동이면 실천이 아니다 */}
              {open.kind === "INSTALLMENT" ? (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-primary-l"
                         style={{ width: `${(open.paidCount / (open.periods || 1)) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[0.76em] text-ink-mute">
                    {savings.progress(open.paidCount, open.periods ?? 0)} · {won(open.paidSoFar)} 모음
                  </p>
                  {open.fullyPaid ? (
                    <p className="mt-1 text-[0.84em] font-bold text-primary-d">{savings.allPaid}</p>
                  ) : open.paidThisWeek ? (
                    <p className="mt-1 text-[0.8em] text-ink-soft">{savings.paidThisWeek}</p>
                  ) : (
                    <form action={payInstallmentAction} className="mt-1.5">
                      <input type="hidden" name="planId" value={open.id} />
                      <button className="min-h-touch w-full rounded-card bg-primary text-[0.86em] font-bold text-white">
                        {savings.payLabel(open.perPeriod ?? 0)}
                      </button>
                      <p className="mt-1 text-[0.72em] text-ink-mute">{savings.skipOk}</p>
                    </form>
                  )}
                </div>
              ) : null}

              {/* 🔴 깨는 것을 막지 않는다. 아이 돈이다. 대신 대가를 먼저 말한다 */}
              {!open.matured ? (
                <form action={breakSavingsAction} className="mt-2">
                  <input type="hidden" name="planId" value={open.id} />
                  <p className="mb-1 text-[0.74em] text-miss">{savings.breakWarn}</p>
                  <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.8em] text-ink-soft">
                    {savings.breakLabel}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      )}

      {closed.length > 0 ? (
        <ul className="mt-1.5 grid gap-1">
          {closed.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
              <span className="flex-1 text-[0.82em]">{c.goal}</span>
              <span className="text-[0.72em] text-ink-mute">
                {c.state === "DONE" ? savings.doneBadge
                 : c.state === "BROKEN" ? savings.brokenBadge : savings.rejectedBadge}
              </span>
              <b className="shrink-0 tabular-nums text-[0.8em]">{won(c.amount)}</b>
            </li>
          ))}
        </ul>
      ) : null}

      <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{historyTitle}</h2>
      {p.history.length === 0 ? <Empty emoji="📒" {...empty} /> : (
        <ul className="grid gap-1">
          {p.history.map((h) => (
            <li key={h.id}
                className={`flex items-center gap-2 rounded-card border px-3 py-2 ${
                  h.code === "ADJUST" ? "border-star bg-star-bg" : "border-line bg-surface"}`}>
              <span className="flex-1">
                <b className="block text-[0.84em]">{h.memo}</b>
                <span className="text-[0.7em] text-ink-mute">
                  {h.whenLabel} · {MOVED_CODES.includes(h.code) ? movedLabel : h.delta > 0 ? inLabel : outLabel}
                </span>
              </span>
              <b className={`shrink-0 tabular-nums text-[0.86em] ${
                h.delta > 0 ? "text-primary-d" : "text-ink-soft"}`}>
                {h.delta > 0 ? "+" : ""}{won(h.delta)}
              </b>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3"><Card tone="grow"><p className="text-[0.86em] leading-relaxed">{notice}</p></Card></div>
    </Screen>
  );
}
