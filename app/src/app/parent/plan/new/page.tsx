import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { CATEGORIES } from "@/contracts/plan";
import { findChild } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import { saveGuardianPlanCard } from "@/app/actions/parent-plan";
import {
  authorNotice, errorNotice, labels, noChild, notice,
  placeholders, subTpl, submitLabel, title, tooBigNotice,
} from "./plan.fixture";

// 온보딩 5단계 — 보호자가 첫 계획 카드를 대신 적는다 (어긋남 대장 D43)
export const metadata = { title: "첫 계획 카드 · 핀프렌즈" };

export default async function ParentPlanNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title={title} back={{ href: "/parent/onboarding", label: "시작하기" }}>
        <Empty emoji="🐣" title={noChild.title} body={noChild.body} hint={noChild.hint} />
        <Link href="/parent/child/new"
              className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white">
          {noChild.action}
        </Link>
      </Screen>
    );
  }

  const sp = await searchParams;

  return (
    <Screen role="부모 화면" title={title}
            sub={subTpl.replace("{name}", child.displayName)}
            back={{ href: "/parent/onboarding", label: "시작하기" }}>
      {sp.error ? (
        <div className="mb-2"><Card tone="miss"><p className="text-sub">
          {sp.error === "too_big" ? tooBigNotice : errorNotice}
        </p></Card></div>
      ) : null}

      {/* 🔴 「부모가 예산을 정해 준다」로 읽히면 안 된다 — 계획 카드는 아이가 적는 것이다 */}
      <Card tone="grow"><p className="text-sub leading-relaxed">{notice}</p></Card>

      <form action={saveGuardianPlanCard} className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span className="text-cap text-ink-mute">{labels.where}</span>
          <input name="where" required placeholder={placeholders.where}
                 className="min-h-touch rounded-card border border-line bg-surface px-3 text-body" />
        </label>

        <div className="grid gap-1">
          <span className="text-cap text-ink-mute">{labels.what}</span>
          {/* 아이 화면과 같은 네 업종이다 — 부모만 보는 목록을 따로 두면 대조가 깨진다 */}
          <ul className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((c, i) => (
              <li key={c.code}>
                <label className="block cursor-pointer">
                  <input type="radio" name="category" value={c.code} defaultChecked={i === 0} className="peer sr-only" required />
                  <span className="grid min-h-touch place-items-center rounded-card border border-line bg-surface text-center text-cap peer-checked:border-primary-l peer-checked:bg-primary-bg peer-checked:font-bold">
                    <span className="text-[1.3em]">{c.icon}</span>{c.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className="grid gap-1">
          <span className="text-cap text-ink-mute">{labels.amount}</span>
          {/* 🔴 `step` 은 검사 도구가 아니다. 100 으로 두면 1500 이 조용히 막힌다 — 실제로 겪었다 */}
          <input name="limitAmount" type="number" inputMode="numeric"
                 min={1} max={1000000} step={1} required placeholder={placeholders.amount}
                 className="min-h-touch rounded-card border border-line bg-surface px-3 text-right text-title font-bold tabular-nums" />
        </label>

        <button type="submit" className="mt-1 min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
          {submitLabel}
        </button>
      </form>

      {/* 🔴 누가 적었는지 남는다는 것을 미리 말한다 — 뒤에 화면에서 보고 놀라지 않게 */}
      <p className="mt-2 text-center text-cap text-ink-mute">{authorNotice}</p>
    </Screen>
  );
}
