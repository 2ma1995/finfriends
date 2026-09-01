import { breakSavingsAction, payInstallmentAction } from "@/app/actions/savings";
import type { SavingsView } from "@/modules/savings";
import { savings } from "@/app/child/allowance/allowance.fixture";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

/**
 * 저금 한 장 — 🔴 **세 개까지 나란히 놓인다** (사용자 결정).
 *
 * 예전엔 통장에 저금이 **하나뿐**이라 화면에 통째로 박혀 있었다. 셋이 되면서
 * 베끼는 대신 컴포넌트로 뺐다 — 베껴 두면 넣기 버튼·깨기 경고가 **한 장만 고쳐진다.**
 */
export function SavingsCard({ open }: { open: SavingsView }) {
  return (
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
  );
}
