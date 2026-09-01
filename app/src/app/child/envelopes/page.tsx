import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getBoard, recentSpends } from "@/modules/envelope";
import { getUnmatched } from "@/modules/card";
import { allocateAction, settleAction } from "@/app/actions/envelope";
import {
  allDone, consentRequired, errors, mockBadge, mockTitle, noDevice, notice, overAsk,
  overBadge, overLabel, overNotice, remainingLabel, saveLabel, savedNotice, settleLabel,
  spentNotice, spentTitle, sub, title, unallocatedLabel, unclassifiedBadge, walletLabel,
  withinBadge,
} from "./envelopes.fixture";

// FR-020 · FR-021 — 봉투 배분과 결제 대조
export const metadata = { title: "봉투 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildEnvelopesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; spent?: string; over?: string; error?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={title} back={{ href: "/child/allowance", label: "내 통장" }}>
        <Empty emoji="✉️" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const [board, txns, spends, sp] = await Promise.all([
    getBoard(access.childId),
    getUnmatched(access.childId, 4),
    recentSpends(access.childId, 8),
    searchParams,
  ]);

  return (
    <Screen role="아이 화면" title={title} sub={sub}
            back={{ href: "/child/allowance", label: "내 통장" }}>
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{errors[sp.error] ?? errors.NO_ENVELOPE}</p>
        </Card></div>
      ) : null}
      {sp.saved || sp.spent ? (
        <div className="mb-2"><Card tone="grow">
          <p className="text-[0.88em]">{sp.saved ? savedNotice : spentNotice}</p>
        </Card></div>
      ) : null}
      {/* 🔴 넘긴 것을 벌처럼 말하지 않는다. 결제는 됐다는 사실을 함께 말한다 (AC-021-2 · P-03) */}
      {sp.over ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{overNotice(Number(sp.over))}</p>
          <p className="mt-1 text-[0.84em] text-ink-soft">{overAsk}</p>
        </Card></div>
      ) : null}

      <div className="rounded-card border border-line bg-sand px-3 py-2 text-center">
        <b className="text-[0.88em]">{walletLabel(board.wallet)}</b>
        <p className="mt-0.5 text-[0.76em] text-ink-mute">
          {board.unallocated > 0 ? unallocatedLabel(board.unallocated) : allDone}
        </p>
      </div>

      {/* 🔴 합계가 쓸 수 있는 돈을 넘으면 저장이 거부된다 (AC-020-1) */}
      <form action={allocateAction} className="mt-2 grid gap-1.5">
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
              {e.overBy > 0 ? overLabel(e.overBy) : remainingLabel(e.remaining)}
              {e.spent > 0 ? ` · 쓴 돈 ${won(e.spent)}` : ""}
            </p>
          </div>
        ))}
        <button className="min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">
          {saveLabel}
        </button>
      </form>

      {/* 🔴 실제 웹훅이 없다. 예시 거래로 흐름을 세우고 그 사실을 밝힌다 */}
      {txns.length > 0 ? (
        <>
          <div className="mt-4 flex items-baseline justify-between">
            <h2 className="text-[0.82em] font-bold">{mockTitle}</h2>
            <span className="text-[0.68em] text-ink-mute">{mockBadge}</span>
          </div>
          <ul className="mt-1.5 grid gap-1">
            {txns.map((t) => (
              <li key={t.id}>
                <form action={settleAction} className="flex items-center gap-2">
                  <input type="hidden" name="txnId" value={t.id} />
                  <button className="flex min-h-touch w-full items-center gap-2 rounded-card border border-line bg-surface px-2 text-left">
                    <span className="text-[1.1em]">{t.icon}</span>
                    <span className="flex-1 text-[0.78em]">{t.merchant}</span>
                    <b className="tabular-nums text-[0.8em]">{won(t.amount)}</b>
                    <span className="shrink-0 text-[0.7em] text-primary-d">{settleLabel}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {spends.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{spentTitle}</h2>
          <ul className="grid gap-1">
            {spends.map((s) => (
              <li key={s.id} className={`flex items-center gap-2 rounded-card border px-3 py-2 ${
                s.within ? "border-line bg-surface" : "border-miss-line bg-miss-bg"}`}>
                <span className="flex-1">
                  <b className="block text-[0.84em]">{s.envelopeEmoji} {s.merchant}</b>
                  <span className="text-[0.7em] text-ink-mute">
                    {s.envelopeName}
                    {s.unclassified ? ` · ${unclassifiedBadge}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-[0.7em] ${s.within ? "text-primary-d" : "text-miss"}`}>
                  {s.within ? withinBadge : `${overBadge} ${won(s.overBy)}`}
                </span>
                <b className="shrink-0 tabular-nums text-[0.84em]">{won(s.amount)}</b>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-3"><Card tone="grow"><p className="text-[0.84em] leading-relaxed">{notice}</p></Card></div>
    </Screen>
  );
}
