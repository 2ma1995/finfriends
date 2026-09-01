import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Empty } from "@/components/shared/Screen";
import { getHistory } from "@/modules/allowance";
import { findChild } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  adjustLink, byGuardianBadge, empty, lockedBadge, movedBadge, notice, reversedBadge,
  sub, title,
} from "./history.fixture";

/**
 * 용돈 기록 — D18.
 *
 * 🔴 **읽기만 한다.** 되돌리기는 `/parent/bank/adjust` 에 있다 —
 *    보는 화면과 고치는 화면을 나누면 목록을 훑다가 실수로 되돌리는 일이 없다.
 */
export const metadata = { title: "용돈 기록 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

/**
 * 🔴 **목표와 적금을 가른다.** `MOVED_CODES` 하나로 묶어 쓰다가
 *    적금 기록까지 「목표로 옮김」으로 나왔다 — 부모가 위시리스트로 읽는다.
 *    둘 다 쓴 게 아니라 묶인 것이지만 **묶인 곳이 다르다.**
 */
const WISH_CODES = ["WISH_SET_ASIDE", "WISH_RELEASE"];
const SAVINGS_CODES = ["SAVINGS_LOCK", "SAVINGS_RELEASE"];

export default async function BankHistoryPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const child = await findChild(guardian.guardianId);
  const history = child ? await getHistory(child.id, 50) : [];

  return (
    <Screen role="부모 화면" title={title} sub={child ? `${child.displayName} · ${sub}` : sub}
            back={{ href: "/parent/bank", label: "아이 통장" }}>
      {history.length === 0 ? (
        <Empty emoji={empty.emoji} title={empty.title} body={empty.body} hint={empty.hint} />
      ) : (
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
              <div className="mt-1 flex flex-wrap gap-x-2 text-[0.72em] text-ink-mute">
                {/* 🔴 누가 적은 줄인지 말한다. 섞이면 누가 무엇을 했는지 모른다 */}
                {h.byGuardian ? <span>{byGuardianBadge}</span> : null}
                {/* 🔴 목표로 옮긴 것은 **쓴 게 아니다.** 같은 「나감」으로 보이면 그렇게 읽힌다 */}
                {WISH_CODES.includes(h.code) ? <span>{movedBadge}</span> : null}
                {SAVINGS_CODES.includes(h.code) ? <span>{lockedBadge}</span> : null}
                {h.reversed ? <span>{reversedBadge}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[0.74em] leading-relaxed text-ink-mute">{notice}</p>

      <Link
        href="/parent/bank/adjust"
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card border border-line-2 bg-surface text-[0.86em] text-ink-soft"
      >
        {adjustLink}
      </Link>
    </Screen>
  );
}
