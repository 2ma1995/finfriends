import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getBalance, getHistory } from "@/modules/allowance";
import {
  balanceLabel, consentRequired, empty, inLabel, noDevice, notice, outLabel, title,
} from "./allowance.fixture";

// D18 — 용돈 기입장. 🔴 두 자료가 가장 강조하는 실천이다
export const metadata = { title: "용돈 기입장 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildAllowancePage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={title} back={{ href: "/child/plan", label: "계획 카드" }}>
        <Empty emoji="📒" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const [balance, history] = await Promise.all([
    getBalance(access.childId),
    getHistory(access.childId, 30),
  ]);

  return (
    <Screen role="아이 화면" title={title} sub={balanceLabel(balance)}
            back={{ href: "/child/plan", label: "계획 카드" }}>
      {history.length === 0 ? <Empty emoji="📒" {...empty} /> : (
        <ul className="grid gap-1">
          {history.map((h) => (
            <li key={h.id}
                className={`flex items-center gap-2 rounded-card border px-3 py-2 ${
                  h.code === "ADJUST" ? "border-star bg-star-bg" : "border-line bg-surface"}`}>
              <span className="flex-1">
                <b className="block text-[0.84em]">{h.memo}</b>
                <span className="text-[0.7em] text-ink-mute">
                  {h.whenLabel} · {h.delta > 0 ? inLabel : outLabel}
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
