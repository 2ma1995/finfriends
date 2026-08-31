import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import { prisma } from "@/db";
import { getBalance, getHistory, MAX_TOPUP } from "@/modules/allowance";
import { reverseEntryAction, topUpAction } from "@/app/actions/allowance";
import {
  amountLabel, balanceLabel, errorNotice, historyTitle, memoLabel, memoPlaceholder,
  fixErrors, fixLabel, fixNotice, fixReasonPlaceholder, fixedNotice, needLogin, noChild,
  notice, reversedBadge, savedNotice, shortNotice, starSeparation, submitLabel, title,
} from "./allowance.fixture";

// D18 — 보호자가 용돈을 적는다. 🔴 앱은 돈을 보관하지 않는다
export const metadata = { title: "용돈 주기 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ParentAllowancePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; fixed?: string; short?: string; fix?: string }>;
}) {
  const g = await currentGuardian();
  if (!g) {
    return (
      <Screen role="부모 화면" title={title} back={{ href: "/parent/tree", label: "성장 나무" }}>
        <Empty emoji="🔒" {...needLogin} />
      </Screen>
    );
  }

  // 🔴 identity 와 activity 를 조인하지 않는다. 아이 id 만 따로 읽어 넘긴다 (REQ-NF-009)
  const child = await prisma.childAccount.findFirst({
    where: { guardianId: g.guardianId }, select: { id: true, displayName: true },
  });
  if (!child) {
    return (
      <Screen role="부모 화면" title={title} back={{ href: "/parent/tree", label: "성장 나무" }}>
        <Empty emoji="👦" {...noChild} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const [balance, history] = await Promise.all([getBalance(child.id), getHistory(child.id, 10)]);

  return (
    <Screen role="부모 화면" title={title} sub={`${child.displayName} · ${won(balance)}`}
            back={{ href: "/parent/tree", label: "성장 나무" }}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-[0.88em]">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss"><p className="text-[0.88em]">{errorNotice}</p></Card></div>
      ) : null}
      {sp.fixed ? (
        <div className="mb-2"><Card tone={sp.short ? "miss" : "grow"}>
          <p className="text-[0.88em]">{fixedNotice(Number(sp.fixed))}</p>
          {sp.short ? <p className="mt-1 text-[0.86em] text-ink-soft">{shortNotice(Number(sp.short))}</p> : null}
        </Card></div>
      ) : null}
      {sp.fix ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{fixErrors[sp.fix] ?? fixErrors.NOT_FOUND}</p>
        </Card></div>
      ) : null}

      {/* 🔴 앱이 돈을 보관한다는 오해를 만들면 안 된다 (D18) */}
      <Card>
        <b className="text-[0.82em]">{notice.title}</b>
        <p className="mt-1 text-[0.86em] leading-relaxed text-ink-soft">{notice.body}</p>
        <p className="mt-2 text-[0.8em] leading-relaxed text-ink-mute">{starSeparation}</p>
      </Card>

      <p className="mt-3 text-center text-[0.9em] font-bold">{balanceLabel(balance)}</p>

      <form action={topUpAction} className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">{amountLabel}</span>
          <input name="amount" type="number" inputMode="numeric" min={1} max={MAX_TOPUP} step={1} required
                 className="min-h-touch rounded-card border border-line bg-surface px-3 text-right text-title font-bold tabular-nums" />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">{memoLabel}</span>
          <input name="memo" maxLength={30} placeholder={memoPlaceholder}
                 className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.9em]" />
        </label>
        <button className="min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">
          {submitLabel}
        </button>
      </form>

      {history.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{historyTitle}</h2>
          <p className="mb-1.5 text-[0.74em] text-ink-mute">{fixNotice}</p>
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
                {h.reversed ? (
                  <p className="mt-1 text-[0.72em] text-ink-mute">{reversedBadge}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
