import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { INTEREST_CHOICES, TOPUP_AMOUNTS } from "@/contracts/bank";
import { findChild } from "@/modules/consent";
import { getBank } from "@/modules/bank";
import { getHistory } from "@/modules/allowance";
import { reverseEntryAction, setInterestAction, topUpMockAction } from "@/app/actions/parent-bank";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  balanceLabel, cardNeeded, fixErrors, fixLabel, fixNotice, fixReasonPlaceholder, fixedNotice,
  historyTitle, interestNotice, missionNotice, moneyNotice, reversedBadge, savedNotice,
  shortNotice, starSeparation, topUpErrors, topUpTitle,
} from "./bank.fixture";

/**
 * 아이 통장(보호자용) — SRS §3 · 충전 · 미션 관리 · 이자율 설정 · 어긋남 대장 D18 · D21.
 *
 * 🔴 **용돈 화면은 여기 하나다.** `/parent/allowance` 를 여기로 합쳤다 —
 *    화면이 둘이면 잔액도 둘이 되고, 실제로 그렇게 갈렸다.
 */
export const metadata = { title: "아이 통장 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ParentBankPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; fixed?: string; short?: string; fix?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title="아이 통장">
        <Empty
          emoji="🐣"
          title="등록한 아이가 없어요"
          body="아이 프로필을 만들면 통장이 열립니다."
          hint="온보딩 3단계"
        />
        <Link
          href="/parent/child/new"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  const sp = await searchParams;
  // 🔴 잔액과 기록은 **같은 원장**에서 온다. 두 곳에서 읽으면 다시 갈린다
  const [view, history] = await Promise.all([
    getBank(guardian.guardianId, child.id, child.displayName),
    getHistory(child.id, 10),
  ]);

  return (
    <Screen role="부모 화면" title="아이 통장" sub={child.displayName}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-[0.88em]">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{topUpErrors[sp.error] ?? topUpErrors.BAD_AMOUNT}</p>
        </Card></div>
      ) : null}
      {sp.fixed ? (
        <div className="mb-2"><Card tone={sp.short ? "miss" : "grow"}>
          <p className="text-[0.88em]">{fixedNotice(Number(sp.fixed))}</p>
          {/* 🔴 못 되돌린 금액을 조용히 넘기지 않는다 — 보호자는 다 취소된 줄 안다 */}
          {sp.short ? <p className="mt-1 text-[0.86em] text-ink-soft">{shortNotice(Number(sp.short))}</p> : null}
        </Card></div>
      ) : null}
      {sp.fix ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{fixErrors[sp.fix] ?? fixErrors.NOT_FOUND}</p>
        </Card></div>
      ) : null}

      {/* 🔴 맨 위에. 앱이 돈을 보관한다는 오해를 만들면 안 된다 (D18) */}
      <Card>
        <b className="text-[0.82em]">{moneyNotice.title}</b>
        <p className="mt-1 text-[0.86em] leading-relaxed text-ink-soft">{moneyNotice.body}</p>
        <p className="mt-2 text-[0.8em] leading-relaxed text-ink-mute">{starSeparation}</p>
      </Card>

      {/* ── 잔액과 충전 ── */}
      <div className="mt-2.5 rounded-card border border-line-2 bg-sand p-3 text-center">
        <span className="block text-[0.72em] text-ink-mute">{balanceLabel}</span>
        <b className="text-[1.6em] tabular-nums">{won(view.balanceWon)}</b>
      </div>

      <section className="mt-2.5">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">{topUpTitle}</h2>
        {/*
          🔴 금액을 직접 입력받지 않는다. 시연에 필요한 것은 「용돈을 줬다고 적는다」이지
             임의 금액이 아니고, 입력란을 두면 실제 이체처럼 읽힌다.
        */}
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {TOPUP_AMOUNTS.map((a) => (
            <form key={a} action={topUpMockAction}>
              <input type="hidden" name="amount" value={a} />
              <button
                type="submit"
                className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.84em] tabular-nums text-ink-soft"
              >
                +{a.toLocaleString("ko-KR")}
              </button>
            </form>
          ))}
        </div>
        {!view.cardActive ? (
          <p className="mt-1.5 text-[0.76em] leading-relaxed text-ink-mute">{cardNeeded}</p>
        ) : null}
      </section>

      {/* ── 기록과 되돌리기 — 원장이 있어야 성립한다 ── */}
      {history.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">{historyTitle}</h2>
          <p className="mb-1.5 mt-1 text-[0.74em] text-ink-mute">{fixNotice}</p>
          <ul className="grid gap-1">
            {history.map((h) => (
              <li key={h.id} className="rounded-card border border-line bg-surface px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[0.84em]">{h.memo}</span>
                  <span className="shrink-0 text-[0.72em] text-ink-mute">{h.whenLabel}</span>
                  <b className={`shrink-0 tabular-nums text-[0.84em] ${h.delta > 0 ? "text-primary-d" : "text-ink-soft"}`}>
                    {h.delta > 0 ? "+" : ""}{won(h.delta)}
                  </b>
                </div>
                {/* 🔴 보호자가 적은 줄만 되돌린다. 아이가 적은 것은 아이 쪽에서 되돌린다 */}
                {h.byGuardian && !h.reversed ? (
                  <form action={reverseEntryAction} className="mt-1.5 flex gap-1.5">
                    <input type="hidden" name="entryId" value={h.id} />
                    <input name="reason" maxLength={30} placeholder={fixReasonPlaceholder}
                           className="min-h-touch flex-1 rounded-card border border-line-2 bg-surface px-2 text-[0.74em]" />
                    <button className="min-h-touch shrink-0 rounded-card border border-line-2 bg-surface px-3 text-[0.76em] text-ink-soft">
                      {fixLabel}
                    </button>
                  </form>
                ) : null}
                {h.reversed ? <p className="mt-1 text-[0.72em] text-ink-mute">{reversedBadge}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 이자율 설정 · 부모가 직접 주는 이자 (§9 A3) ── */}
      <section className="mt-4">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">이자율</h2>
        <div className="mt-1.5">
          <Card tone={view.interestPct !== null ? "grow" : "surface"}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.8em] text-ink-mute">지금 이자율</span>
              <b className="text-[1.1em] tabular-nums">
                {view.interestPct === null ? "아직 없어요" : `${view.interestPct}%`}
              </b>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1">
              {INTEREST_CHOICES.map((pct) => (
                <form key={pct} action={setInterestAction}>
                  <input type="hidden" name="pct" value={pct} />
                  <button
                    type="submit"
                    className={`min-h-touch w-full rounded-card border text-[0.82em] tabular-nums ${
                      view.interestPct === pct
                        ? "border-primary-l bg-primary-bg font-bold text-primary-d"
                        : "border-line-2 bg-surface text-ink-soft"
                    }`}
                  >
                    {pct}%
                  </button>
                </form>
              ))}
            </div>

            {view.interestPct !== null ? (
              <div className="mt-2 rounded-card border border-line bg-surface px-3 py-2">
                <div className="flex items-baseline justify-between gap-2 text-[0.82em]">
                  <span className="text-ink-mute">{child.displayName}이 모은 돈</span>
                  <b className="tabular-nums">{won(view.savedWon)}</b>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2 text-[0.82em]">
                  <span className="text-ink-mute">한 번 줄 때 이자</span>
                  <b className="tabular-nums text-primary-d">{won(view.interestWon)}</b>
                </div>
              </div>
            ) : null}

            <p className="mt-2 text-[0.8em] leading-relaxed text-ink-soft">{interestNotice.body}</p>
            <p className="mt-1 text-[0.78em] leading-relaxed text-miss">{interestNotice.todo}</p>
          </Card>
        </div>
      </section>

      {/* ── 미션 관리 — SRS 는 이것도 통장 안에 뒀다 ── */}
      <section className="mt-4">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">미션 관리</h2>
        <div className="mt-1.5 grid gap-1">
          <Link
            href="/parent/bank/missions"
            className="flex min-h-touch items-center justify-between rounded-card border border-line bg-surface px-3 text-[0.86em]"
          >
            <span>승인을 기다리는 미션</span>
            <b className={view.waitingMissions > 0 ? "text-miss" : "text-ink-mute"}>
              {view.waitingMissions}건 →
            </b>
          </Link>
          <Link
            href="/parent/bank/missions/new"
            className="flex min-h-touch items-center justify-between rounded-card border border-line bg-surface px-3 text-[0.86em]"
          >
            <span>미션 만들기</span>
            <span className="text-[0.86em] text-ink-mute">아직 안 한 미션 {view.openMissions}개 →</span>
          </Link>
        </div>
        <p className="mt-1.5 text-[0.74em] leading-relaxed text-ink-mute">{missionNotice}</p>
      </section>
    </Screen>
  );
}
