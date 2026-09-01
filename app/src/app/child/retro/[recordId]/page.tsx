import Link from "next/link";
import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getRetro } from "@/modules/plan";
import type { SpendLineView } from "@/contracts/plan";
import { confirmLabel, consentRequired, noDevice, notFound, otherBranchLabel } from "./retro.fixture";
import { cardGap, cardMockBadge, cardSame, cardTitle } from "@/app/child/plan/plan-list.fixture";

// PLN-003 — 두 갈래 회고. 🔴 목이 아니라 DB 를 본다
export const metadata = { title: "계획 ↔ 실제 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

function Column({ head, lines, alert }: { head: string; lines: readonly SpendLineView[]; alert: boolean }) {
  const sum = lines.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <h2 className="mb-1.5 text-cap tracking-[0.04em] text-ink-mute">{head}</h2>
      {lines.length === 0 ? (
        <p className="py-1 text-sub text-ink-mute">없어요</p>
      ) : lines.map((l) => (
        <div key={l.label} className={`flex justify-between py-0.5 text-sub ${l.unplanned ? "font-bold text-miss" : ""}`}>
          <span>{l.icon} {l.label}</span><span className="tabular-nums">{won(l.amount)}</span>
        </div>
      ))}
      <div className={`mt-1.5 flex justify-between border-t border-line pt-1.5 text-sub font-bold ${alert ? "text-miss" : ""}`}>
        <span>합계</span><span className="tabular-nums">{won(sum)}</span>
      </div>
    </div>
  );
}

export default async function ChildRetroPage({ params }: { params: Promise<{ recordId: string }> }) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="계획 ↔ 실제" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="📝" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const r = await getRetro(access.childId, (await params).recordId);
  if (!r) {
    return (
      <Screen role="아이 화면" title="계획 ↔ 실제" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="📝" {...notFound} />
      </Screen>
    );
  }

  const met = r.match === "MET";

  return (
    <Screen role="아이 화면" title="계획 ↔ 실제" sub={r.whenLabel} back={{ href: "/child/home", label: "내 방" }}>
      <div className="grid grid-cols-2 gap-2">
        <Column head="적어둔 것" lines={r.planned} alert={false} />
        <Column head="실제로 쓴 것" lines={r.actual} alert={!met} />
      </div>

      {/* 🔴 넘김에도 문장은 똑같이 나온다. 색은 테라코타이고 경고색이 아니다 */}
      <div className={`mt-2 rounded-card border p-3 ${met ? "border-primary-l/50 bg-primary-bg" : "border-miss-line bg-miss-bg"}`}>
        <p className="ff-serif text-body leading-relaxed">
          {r.retroLines.map((l) => <span key={l} className="block">{l}</span>)}
        </p>
        <div className={`mt-2 text-sub font-bold ${met ? "text-primary-d" : "text-miss"}`}>{r.starLabel}</div>

        {/* 🔴 카드 내역과 대조 — 자동으로 고쳐 주지 않는다. 차이를 마주하는 것이 학습이다 (D19) */}
        {r.card ? (
          <div className="mt-2 rounded-card border border-dashed border-line-2 px-3 py-2">
            <div className="flex items-baseline justify-between">
              <span className="text-cap text-ink-soft">{cardTitle}</span>
              {r.card.isMock ? <span className="text-micro text-ink-mute">{cardMockBadge}</span> : null}
            </div>
            <p className="mt-0.5 text-sub">
              {r.card.merchant} · {r.card.amount.toLocaleString("ko-KR")}원
            </p>
            <p className={`mt-0.5 text-sub ${r.card.gap === 0 ? "text-primary-d" : "text-star-d"}`}>
              {r.card.gap === 0 ? cardSame : cardGap(r.card.gap)}
            </p>
          </div>
        ) : null}
      </div>

      {/*
        아이가 하는 유일한 조작 — 이유를 고르게 하지 않는다.

        🔴 **아무 데도 안 가는 버튼이었다.** `<button>` 인데 폼도 핸들러도 없어서
           눌러도 화면이 그대로였다 — 아이는 「눌렸나?」로 남는다.
           회고를 닫고 나면 갈 곳은 **계획 카드**다. 거기서 다음 장을 적는다.
      */}
      <Link href="/child/plan"
            className="mt-2 grid min-h-touch w-full place-items-center rounded-card bg-primary text-body font-bold text-white">
        {confirmLabel}
      </Link>

      {r.otherBranchId ? (
        <p className="mt-2 text-center text-cap text-ink-mute">
          다른 갈래 보기 —{" "}
          <Link href={`/child/retro/${r.otherBranchId}`} className="underline underline-offset-2">
            {otherBranchLabel(met)}
          </Link>
        </p>
      ) : null}
    </Screen>
  );
}
