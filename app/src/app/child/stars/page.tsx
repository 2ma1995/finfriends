import { Screen, Card, Empty } from "@/components/shared/Screen";
import { StarHUD } from "@/components/child/StarHUD";
import { currentChild } from "@/lib/session/current-child";
import { getWallet } from "@/modules/star-ledger";
import { consentRequired, noDevice, notice } from "./ledger.fixture";

// STR-001 — 별 원장. 🔴 목이 아니라 **DB** 를 본다
export const metadata = { title: "내 별 · 핀프렌즈" };

export default async function ChildStarsPage() {
  const access = await currentChild();

  if (!access.ok) {
    // 아이 탓으로 읽히지 않게 — 「막혔다」가 아니라 「아직 준비가 안 됐다」 (AC-3.2 규율)
    const msg = access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice;
    return (
      <Screen role="아이 화면" title="내 별">
        <Empty emoji="⭐" {...msg} />
      </Screen>
    );
  }

  const wallet = await getWallet(access.childId);

  return (
    <Screen role="아이 화면" title="내 별" back={{ href: "/child/home", label: "내 방" }}>
      <StarHUD balance={wallet.balance} />

      {wallet.entries.length === 0 ? (
        <div className="mt-3">
          <Empty emoji="🌱" title="아직 별이 없어요" body="첫 실천 하나면 별이 생겨요" hint="미션을 하나 만들어 보세요" />
        </div>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {wallet.entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2">
              <span className="min-w-0">
                <b className="block text-[0.86em]">{e.reason}</b>
                <span className="text-[0.72em] text-ink-mute">{e.whenLabel} · {e.kind}</span>
              </span>
              <b className={`shrink-0 tabular-nums text-[0.92em] ${e.delta > 0 ? "text-primary-d" : "text-ink-mute"}`}>
                {e.delta > 0 ? `+${e.delta}` : e.delta}
              </b>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3"><Card><p className="text-[0.84em] leading-relaxed text-ink-soft">{notice}</p></Card></div>
    </Screen>
  );
}
