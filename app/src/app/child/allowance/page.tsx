import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getPassbook, MOVED_CODES } from "@/modules/allowance";
import {
  balanceTitle, card, consentRequired, empty, historyTitle, inLabel, interest,
  movedLabel, noDevice, notice, outLabel, savedTitle, setAsideNotice, title, totalTitle,
} from "./allowance.fixture";

// D18 · D20 — 아이 통장. 🔴 두 자료가 가장 강조하는 실천이 용돈기입장 쓰기다
export const metadata = { title: "내 통장 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildPassbookPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={title} back={{ href: "/child/plan", label: "계획 카드" }}>
        <Empty emoji="📒" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const p = await getPassbook(access.childId, access.guardianId);
  const stage = card[p.card];

  return (
    <Screen role="아이 화면" title={title} back={{ href: "/child/plan", label: "계획 카드" }}>
      {/* 🔴 **가진 돈 전체가 먼저다.** 「쓸 수 있는 돈」만 크게 보이면
          목표에 떼어 둔 돈이 없어진 것처럼 보인다 — 부모 화면과 숫자가 갈리던 원인이다 */}
      <div className="rounded-card border border-line bg-surface px-3 py-3 text-center">
        <div className="text-[0.74em] text-ink-mute">{totalTitle}</div>
        <b className="mt-0.5 block text-title tabular-nums">{won(p.total)}</b>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div className="rounded-card border border-line bg-surface px-3 py-2 text-center">
          <div className="text-[0.7em] text-ink-mute">{balanceTitle}</div>
          <b className="mt-0.5 block text-[1.05em] tabular-nums">{won(p.balance)}</b>
        </div>
        <div className="rounded-card border border-line bg-sand px-3 py-2 text-center">
          <div className="text-[0.7em] text-ink-mute">{savedTitle}</div>
          <b className="mt-0.5 block text-[1.05em] tabular-nums">{won(p.savedWon)}</b>
        </div>
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
              <p className="mt-1 text-[0.88em]">{interest.rate(p.interestPct)}</p>
              <p className="mt-0.5 text-[0.92em] font-bold text-primary-d">
                {p.savedWon > 0 ? interest.amount(p.interestWon) : interest.zero}
              </p>
              <p className="mt-1 text-[0.76em] text-ink-mute">{interest.notice}</p>
            </>
          )}
        </Card>
      </div>

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
