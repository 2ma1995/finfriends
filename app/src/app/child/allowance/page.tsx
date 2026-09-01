import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getPassbook, MOVED_CODES } from "@/modules/allowance";
import {
  getClosed, getOpen, MAX_MONTHS, MAX_PERIODS, MIN_AMOUNT, MIN_PER_PERIOD, MIN_PERIODS, WANTED_CHOICES,
} from "@/modules/savings";
import { breakSavingsAction, payInstallmentAction, requestSavingsAction } from "@/app/actions/savings";
import {
  balanceTitle, card, consentRequired, empty, historyTitle, inLabel, interest,
  errors, movedLabel, noDevice, notice, outLabel, savedTitle, savings,
  setAsideNotice, title, totalTitle,
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
      <Screen role="아이 화면" title={title} back={{ href: "/child/plan", label: "계획 카드" }}>
        <Empty emoji="📒" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const [p, open, closed] = await Promise.all([
    getPassbook(access.childId, access.guardianId),
    getOpen(access.childId),
    getClosed(access.childId, 3),
  ]);
  const stage = card[p.card];

  return (
    <Screen role="아이 화면" title={title} back={{ href: "/child/plan", label: "계획 카드" }}>
      {/* 🔴 **가진 돈 전체가 먼저다.** 「쓸 수 있는 돈」만 크게 보이면
          목표에 떼어 둔 돈이 없어진 것처럼 보인다 — 부모 화면과 숫자가 갈리던 원인이다 */}
      <div className="rounded-card border border-line bg-surface px-3 py-3 text-center">
        <div className="text-[0.74em] text-ink-mute">{totalTitle}</div>
        <b className="mt-0.5 block text-title tabular-nums">{won(p.total)}</b>
      </div>

      <div className={`mt-1.5 grid gap-1.5 ${p.locked > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-card border border-line bg-surface px-2 py-2 text-center">
          <div className="text-[0.68em] text-ink-mute">{balanceTitle}</div>
          <b className="mt-0.5 block text-[0.98em] tabular-nums">{won(p.balance)}</b>
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

      {/* 🔴 아직 받은 이자가 아니다. 「한 번 줄 때 얼마인지」만 보여준다 */}
      <div className="mt-2">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{interest.title}</h2>
          {p.interestPct === null ? (
            <p className="mt-1 text-[0.86em] text-ink-soft">{interest.none}</p>
          ) : (
            <>
              <p className="mt-1 text-[0.92em] font-bold text-primary-d">{interest.rate(p.interestPct)}</p>
              {/* 🔴 무엇에 붙는지 분명히 말한다. 안 적으면 아이는 모든 돈에 붙는 줄 안다 */}
              <p className="mt-1 text-[0.76em] text-ink-mute">{interest.notice}</p>
            </>
          )}
        </Card>
      </div>

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

      {open === null ? (
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-[0.86em] leading-relaxed">{savings.what}</p>
          <p className="mt-1 text-[0.74em] text-ink-mute">{savings.notBank}</p>

          {/* 🔴 이자율이 아직 없어도 신청할 수 있다. 막으면 새 집은 영영 신청을 못 한다 —
              이자를 정하는 자리가 「받아들이기」로 옮겨졌기 때문이다 */}
          {p.interestPct === null ? (
            <p className="mt-2 text-[0.8em] text-ink-mute">{savings.rateLater}</p>
          ) : null}
          <form action={requestSavingsAction} className="mt-2 grid gap-2">
              <label className="grid gap-1">
                <span className="text-[0.72em] text-ink-mute">{savings.goalLabel}</span>
                <input name="goal" required maxLength={30} placeholder={savings.goalPlaceholder}
                       className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.9em]" />
              </label>
              {/* 🔴 학습 save-3 이 가르치는 두 가지. 이름과 동작이 어긋나면 배운 게 무너진다 */}
              <div className="grid gap-1">
                <span className="text-[0.72em] text-ink-mute">{savings.kindLabel}</span>
                <ul className="grid grid-cols-2 gap-1.5">
                  {(["INSTALLMENT", "DEPOSIT"] as const).map((k) => (
                    <li key={k}>
                      <label className="block cursor-pointer">
                        <input type="radio" name="kind" value={k}
                               defaultChecked={k === "INSTALLMENT"} className="peer sr-only" />
                        <span className="grid min-h-touch place-items-center rounded-card border border-line bg-surface py-1 text-center text-[0.76em] peer-checked:border-primary peer-checked:bg-primary-bg">
                          <b>{savings.kinds[k].label}</b>
                          <span className="text-[0.86em] text-ink-mute">{savings.kinds[k].hint}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[0.72em] text-ink-mute">{savings.perPeriodLabel}</span>
                  <input name="perPeriod" type="number" inputMode="numeric" step={1}
                         min={MIN_PER_PERIOD} max={Math.max(MIN_PER_PERIOD, p.balance)}
                         defaultValue={MIN_PER_PERIOD}
                         className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[0.72em] text-ink-mute">{savings.periodsLabel}</span>
                  <input name="periods" type="number" inputMode="numeric" step={1}
                         min={MIN_PERIODS} max={MAX_PERIODS} defaultValue={12}
                         className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
                </label>
              </div>

              <details className="rounded-card border border-line-2 px-2 py-1">
                <summary className="cursor-pointer text-[0.74em] text-ink-mute">
                  {savings.kinds.DEPOSIT.label} — {savings.kinds.DEPOSIT.hint}
                </summary>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[0.72em] text-ink-mute">{savings.amountLabel}</span>
                  <input name="amount" type="number" inputMode="numeric" step={1}
                         min={MIN_AMOUNT} max={Math.max(MIN_AMOUNT, p.balance)}
                         defaultValue={MIN_AMOUNT}
                         className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[0.72em] text-ink-mute">{savings.monthsLabel}</span>
                  <input name="months" type="number" inputMode="numeric" step={1}
                         min={1} max={MAX_MONTHS} defaultValue={3}
                         className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
                </label>
                </div>
              </details>
              {/* 🔴 「선택」이 아니라 「제안」이다. 정하는 사람을 **누르기 전에** 말한다 */}
              <div className="grid gap-1">
                <span className="text-[0.72em] text-ink-mute">{savings.wantLabel}</span>
                <p className="text-[0.72em] text-ink-mute">
                  {p.interestPct === null ? savings.wantNoRate : savings.wantNotice(p.interestPct)}
                </p>
                <ul className="mt-0.5 grid grid-cols-4 gap-1">
                  {WANTED_CHOICES.map((w) => (
                    <li key={w}>
                      <label className="block cursor-pointer">
                        <input type="radio" name="wantedPct" value={w}
                               defaultChecked={w === (p.interestPct ?? 5)} className="peer sr-only" />
                        <span className="grid min-h-touch place-items-center rounded-card border border-line bg-surface text-[0.8em] peer-checked:border-primary peer-checked:bg-primary-bg peer-checked:font-bold">
                          {w}%
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="text-[0.72em] font-bold text-ink-soft">{savings.wantWho}</p>
              </div>

              <button disabled={p.balance < MIN_AMOUNT}
                      className="min-h-touch w-full rounded-card bg-primary text-[0.88em] font-bold text-white disabled:opacity-40">
                {savings.ask}
              </button>
          </form>
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
              ? `${savings.kinds.INSTALLMENT.label} · 한 주 ${won(open.perPeriod ?? 0)} · 이자 ${open.interestPct}%`
              : `${savings.kinds.DEPOSIT.label} · ${open.months}달 · 이자 ${open.interestPct}%`}
          </p>
          {/* 🔴 바란 것과 다르면 그 사실을 말한다. 조용히 넘기면 「왜 물어봤지」가 된다 */}
          {open.wantedPct !== null ? (
            <p className={`mt-0.5 text-[0.74em] ${open.differs ? "text-star-d" : "text-primary-d"}`}>
              {open.state === "REQUESTED"
                ? savings.wantedShown(open.wantedPct)
                : open.differs ? savings.gaveInstead(open.interestPct) : savings.sameAsWanted}
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
