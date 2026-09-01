import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import { houseRate, listForGuardian, MAX_PCT } from "@/modules/savings";
import {
  acceptSavingsAction, completeSavingsAction, rejectSavingsAction,
} from "@/app/actions/parent-savings";
import {
  acceptLabel, acceptedNotice, activeTitle, completeLabel, completeNotice, daysLeft,
  doneNotice, empty, errors, houseLabel, interestPreview, maturedLabel, needLogin,
  annualLabel, annualNote, annualUnknown, benchmark,
  notice, pctCarryNote, pctLabel, reasonPlaceholder, rejectLabel, rejectedNotice, requestedTitle,
  title, wantedLabel, wantedMore,
} from "./savings.fixture";

// D25 — 보호자가 적금을 받아들이고 만기를 처리한다
export const metadata = { title: "우리 집 적금 · 핀프렌즈" };
/**
 * 연 환산 이율 — `FR-031` 「부모 앱에 연 환산 이율을 병기」.
 *
 * 🔴 **단순 환산이다.** 「3개월에 5%」 → 연 20%. 복리가 아니라 기간 비례로 편다 —
 *    아이와 하는 약속에 복리를 쓰면 설명할 수 없는 숫자가 된다.
 * 🔴 기간이 없거나 0이면 **환산하지 않는다.** 없는 값을 0으로 그리지 않는다.
 */
function annualPct(interestPct: number, months: number): number | null {
  if (!Number.isFinite(months) || months <= 0) return null;
  return Math.round((interestPct * 12) / months * 10) / 10;
}

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ParentSavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ accepted?: string; rejected?: string; done?: string; error?: string }>;
}) {
  const g = await currentGuardian();
  if (!g) {
    return (
      <Screen role="부모 화면" title={title} back={{ href: "/parent/bank", label: "아이 통장" }}>
        <Empty emoji="🔒" {...needLogin} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const [{ requested, active }, rate] = await Promise.all([
    listForGuardian(g.guardianId),
    houseRate(g.guardianId),
  ]);

  return (
    <Screen role="부모 화면" title={title} sub={houseLabel(rate)}
            back={{ href: "/parent/bank", label: "아이 통장" }}>
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-sub">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}
      {sp.accepted || sp.rejected || sp.done ? (
        <div className="mb-2"><Card tone="grow"><p className="text-sub">
          {sp.accepted ? acceptedNotice : sp.rejected ? rejectedNotice : doneNotice}
        </p></Card></div>
      ) : null}

      {/* 🔴 무엇을 승인하는 것인지 분명히 말한다 — 실제 금융상품이 아니다 */}
      <Card>
        <b className="text-sub">{notice.title}</b>
        <p className="mt-1 text-sub leading-relaxed text-ink-soft">{notice.body}</p>
      </Card>

      {requested.length === 0 && active.length === 0 ? (
        <div className="mt-3"><Empty emoji="🐖" {...empty} /></div>
      ) : null}

      {requested.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-sub font-bold">{requestedTitle}</h2>
          <ul className="grid gap-2">
            {requested.map((s) => (
              <li key={s.id} className="rounded-card border border-star bg-star-bg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-body">{s.goal}</b>
                  <b className="shrink-0 tabular-nums text-body">{won(s.amount)}</b>
                </div>
                <div className="mt-0.5 text-cap text-ink-mute">
                  {s.months}달 · {houseLabel(s.interestPct)}
                </div>
                {/* 🔴 아이가 더 바랐다는 사실을 조용히 넘기지 않는다 */}
                {s.wantedPct !== null ? (
                  <p className={`mt-1 text-sub ${s.differs ? "text-star-d" : "text-ink-soft"}`}>
                    {wantedLabel(s.wantedPct)}
                    {s.wantedPct > s.interestPct ? ` · ${wantedMore}` : ""}
                  </p>
                ) : null}

                <form action={acceptSavingsAction} className="mt-2 grid gap-1.5">
                  <input type="hidden" name="planId" value={s.id} />
                  <label className="flex items-center gap-2">
                    <span className="text-cap text-ink-mute">{pctLabel}</span>
                    <input name="pct" type="number" inputMode="numeric" min={0} max={MAX_PCT} step={1}
                           defaultValue={s.interestPct}
                           className="min-h-touch w-20 rounded-card border border-line bg-surface px-2 text-right text-body tabular-nums" />
                    <span className="text-sub">%</span>
                  </label>
                  <p className="text-cap text-ink-mute">{interestPreview(s.interestWon)}</p>
                  {/*
                    🔴 아이는 「한 주에 500원」을 보고 부모는 연 환산을 본다 (FR-031).
                       숫자 하나만 보면 후한지 박한지 알 수 없어 견줄 기준을 함께 둔다.
                  */}
                  {(() => {
                    const a = annualPct(s.interestPct, s.months);
                    return a === null ? (
                      <p className="text-cap text-ink-mute">{annualUnknown}</p>
                    ) : (
                      <div className="rounded-card border border-line bg-surface px-2.5 py-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-sub">
                          <span className="text-ink-mute">{annualLabel}</span>
                          <b className="tabular-nums">약 {a}%</b>
                        </div>
                        <p className="mt-0.5 text-cap leading-relaxed text-ink-mute">{benchmark}</p>
                        <p className="mt-0.5 text-cap leading-relaxed text-ink-mute">{annualNote}</p>
                      </div>
                    );
                  })()}
                  {/* 🔴 이 숫자가 이 한 건에만 쓰이는 게 아니라는 것을 말한다 (D28-b) */}
                  <p className="text-cap leading-relaxed text-ink-mute">{pctCarryNote}</p>
                  <button className="min-h-touch w-full rounded-card bg-primary text-sub font-bold text-white">
                    {acceptLabel}
                  </button>
                </form>

                <form action={rejectSavingsAction} className="mt-1.5 grid gap-1">
                  <input type="hidden" name="planId" value={s.id} />
                  <input name="reason" maxLength={40} placeholder={reasonPlaceholder}
                         className="min-h-touch w-full rounded-card border border-line-2 bg-surface px-2 text-cap" />
                  <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-sub text-ink-soft">
                    {rejectLabel}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {active.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-sub font-bold">{activeTitle}</h2>
          <ul className="grid gap-2">
            {active.map((s) => (
              <li key={s.id} className="rounded-card border border-primary-l bg-primary-bg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-body">{s.goal}</b>
                  <b className="shrink-0 tabular-nums text-body">{won(s.amount)}</b>
                </div>
                <div className="mt-0.5 text-cap text-ink-mute">
                  {s.months}달 · 이자 {s.interestPct}% · {s.matured ? maturedLabel : daysLeft(s.daysLeft ?? 0)}
                </div>
                <p className="mt-1 text-sub text-star-d">{interestPreview(s.interestWon)}</p>

                {/* 🔴 만기 전에는 버튼을 안 보인다. 서버도 다시 막는다 */}
                {s.matured ? (
                  <form action={completeSavingsAction} className="mt-2">
                    <input type="hidden" name="planId" value={s.id} />
                    <p className="mb-1 text-cap text-ink-mute">{completeNotice}</p>
                    <button className="min-h-touch w-full rounded-card bg-primary text-sub font-bold text-white">
                      {completeLabel}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
