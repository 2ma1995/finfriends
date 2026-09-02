import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { getHistory } from "@/modules/allowance";
import { findChild } from "@/modules/consent";
import { reverseEntryAction } from "@/app/actions/parent-bank";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  empty, fixErrors, fixLabel, fixReasonPlaceholder, fixedNotice, historyLink, lead,
  onlyGuardianNotice, reversedBadge, shortNotice, sub, title,
} from "./adjust.fixture";

/**
 * 보낸 돈 수정하기 — D18.
 *
 * 🔴 **고치는 화면을 따로 뒀다.** 보는 화면(`/parent/bank/history`)과 섞으면
 *    목록을 훑다가 실수로 되돌린다. 되돌리기는 아이 장부를 바꾸는 일이다.
 *
 * 🔴 **보호자가 적은 줄만 보여준다.** 아이가 한 것은 목록에 넣지 않는다 —
 *    보이면 「왜 안 되지」가 되고, 안 보이면 애초에 묻지 않는다.
 */
export const metadata = { title: "보낸 돈 수정하기 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function BankAdjustPage({
  searchParams,
}: {
  searchParams: Promise<{ fixed?: string; short?: string; fix?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const [sp, child] = await Promise.all([searchParams, findChild(guardian.guardianId)]);
  const history = child ? await getHistory(child.id, 50, "exact") : [];
  /**
   * 🔴 **조건을 여기서 조립하지 않는다.** 모듈이 `reversible` 로 판정한다 —
   *    화면이 다시 조립하면 서버(`reverseEntry`)와 어긋난다. 실제로 어긋나 있었다.
   */
  const fixable = history.filter((h) => h.reversible);

  return (
    <Screen title={title} sub={child ? `${child.displayName} · ${sub}` : sub}
            back={{ href: "/parent/bank", label: "아이 통장" }}>
      {sp.fixed ? (
        <div className="mb-2"><Card tone={sp.short ? "miss" : "grow"}>
          <p className="text-sub">{fixedNotice(Number(sp.fixed))}</p>
          {/* 🔴 못 되돌린 금액을 조용히 넘기지 않는다 — 보호자는 다 취소된 줄 안다 */}
          {sp.short ? <p className="mt-1 text-sub text-ink-soft">{shortNotice(Number(sp.short))}</p> : null}
        </Card></div>
      ) : null}
      {sp.fix ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-sub">{fixErrors[sp.fix] ?? fixErrors.NOT_FOUND}</p>
        </Card></div>
      ) : null}

      <Card>
        <p className="text-sub leading-relaxed">{lead}</p>
        <p className="mt-1.5 text-sub leading-relaxed text-ink-mute">{onlyGuardianNotice}</p>
      </Card>

      {fixable.length === 0 ? (
        <div className="mt-3">
          <Empty emoji={empty.emoji} title={empty.title} body={empty.body} hint={empty.hint} />
        </div>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {fixable.map((h) => (
            <li key={h.id} className="rounded-card bg-surface px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sub">{h.memo}</span>
                <span className="shrink-0 text-cap text-ink-mute">{h.whenLabel}</span>
                <b className="shrink-0 tabular-nums text-sub text-primary-d">+{won(h.delta)}</b>
              </div>
              <form action={reverseEntryAction} className="mt-2 flex gap-1.5">
                <input type="hidden" name="entryId" value={h.id} />
                <input name="reason" maxLength={30} placeholder={fixReasonPlaceholder}
                       className="min-h-touch min-w-0 flex-1 rounded-card border border-line-2 bg-surface px-2 text-cap" />
                <button className="min-h-touch shrink-0 rounded-card border border-miss-line bg-miss-bg px-3 text-sub text-miss">
                  {fixLabel}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* 이미 되돌린 것 — 왜 목록에 없는지 알 수 있게 */}
      {history.some((h) => h.reversed) ? (
        <p className="mt-2 text-cap text-ink-mute">{reversedBadge} — 되돌린 기록은 「기록」에 남아 있어요.</p>
      ) : null}

      <Link
        href="/parent/bank/history"
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card border border-line-2 bg-surface text-sub text-ink-soft"
      >
        {historyLink}
      </Link>
    </Screen>
  );
}
