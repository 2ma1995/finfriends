import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { CATEGORIES } from "@/contracts/plan";
import { savePlanCard } from "@/app/actions/plan";
import {
  consentRequired, errorNotice, labels, noDevice, notice, placeholders,
  savedNotice, submitLabel, tooBigNotice,
} from "./plan.fixture";

// PLN-001 — 계획 카드 적기. 🔴 아이 화면의 첫 **쓰기** 기능
export const metadata = { title: "계획 카드 · 핀프렌즈" };

export default async function ChildPlanNewPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="계획 카드 적기" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="📝" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;

  return (
    <Screen role="아이 화면" title="계획 카드 적기" back={{ href: "/child/home", label: "내 방" }}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-[0.88em]">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss"><p className="text-[0.88em]">
          {sp.error === "too_big" ? tooBigNotice : errorNotice}
        </p></Card></div>
      ) : null}

      <Card tone="grow"><p className="text-[0.88em] leading-relaxed">{notice}</p></Card>

      <form action={savePlanCard} className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">{labels.where}</span>
          <input name="where" required placeholder={placeholders.where}
                 className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.92em]" />
        </label>

        <div className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">{labels.what}</span>
          {/* 라디오로 둔다 — 아이가 고르는 것이지 적는 것이 아니다 */}
          <ul className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((c, i) => (
              <li key={c.code}>
                <label className="block cursor-pointer">
                  <input type="radio" name="category" value={c.code} defaultChecked={i === 0} className="peer sr-only" required />
                  <span className="grid min-h-touch place-items-center rounded-card border border-line bg-surface text-center text-[0.72em] peer-checked:border-primary-l peer-checked:bg-primary-bg peer-checked:font-bold">
                    <span className="text-[1.3em]">{c.icon}</span>{c.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">{labels.amount}</span>
          {/* 🔴 `step` 을 100 으로 두면 브라우저가 1·101·201… 만 유효로 본다 —
              아이가 1500 을 적어도 **제출이 조용히 막힌다.** 실제로 그렇게 막혔다.
              step 은 값을 검사하는 도구가 아니다. 범위는 min·max 로만 건다. */}
          <input name="limitAmount" type="number" inputMode="numeric"
                 min={1} max={1000000} step={1} required
                 placeholder={placeholders.amount}
                 className="min-h-touch rounded-card border border-line bg-surface px-3 text-right text-title font-bold tabular-nums" />
        </label>

        <button type="submit" className="mt-1 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">
          {submitLabel}
        </button>
      </form>
    </Screen>
  );
}
