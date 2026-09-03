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
  searchParams: Promise<{ saved?: string; error?: string; where?: string; amount?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen title="계획 카드 적기" back={{ href: "/child/plan", label: "계획 카드" }}>
        <Empty emoji="📝" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;

  return (
    <Screen title="계획 카드 적기" back={{ href: "/child/plan", label: "계획 카드" }}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-sub">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss"><p className="text-sub">
          {sp.error === "too_big" ? tooBigNotice : errorNotice}
        </p></Card></div>
      ) : null}

      <Card tone="grow"><p className="text-sub leading-relaxed">{notice}</p></Card>

      <form action={savePlanCard} className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span className="text-cap text-ink-mute">{labels.where}</span>
            {/* 🔴 틀린 칸만 고치면 되게 **적은 것을 되채운다** (D66) */}
            <input name="where" required defaultValue={sp.where ?? ""} placeholder={placeholders.where}
                 className="min-h-touch w-full min-w-0 rounded-card border border-line bg-surface px-3 text-body" />
        </label>

        <div className="grid gap-1">
          <span className="text-cap text-ink-mute">{labels.what}</span>
          {/* 라디오로 둔다 — 아이가 고르는 것이지 적는 것이 아니다 */}
          <ul className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((c, i) => (
              <li className="min-w-0" key={c.code}>
                <label className="block cursor-pointer">
                    {/* 🔴 **`sr-only` 라디오에 `required` 를 걸지 않는다** (D66) —
                           안 보이는 컨트롤이라 브라우저가 말풍선 띄울 자리조차 없다.
                           아무 반응 없이 폼이 죽는다. 하나는 늘 선택돼 있고 서버가 다시 본다 */}
                    <input type="radio" name="category" value={c.code} defaultChecked={i === 0} className="peer sr-only" />
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
          {/* 🔴 `step` 을 100 으로 두면 브라우저가 1·101·201… 만 유효로 본다 —
              아이가 1500 을 적어도 **제출이 조용히 막힌다.** 실제로 그렇게 막혔다.
              step 은 값을 검사하는 도구가 아니다. 범위는 min·max 로만 건다. */}
            {/*
              🔴 **`min`·`max`·`required` 를 걸지 않는다** (어긋남 대장 D66).
                 범위 밖 값을 넣으면 브라우저가 조용히 막고 자기 말풍선만 띄운다 —
                 아이는 「버튼이 고장 났다」고 읽는다.
                 `savePlanCard` 가 검사하고 `?error=1` · `?error=too_big` 으로
                 돌려보내며, 그 문구가 이 화면 맨 위에 뜬다.
            */}
            <input name="limitAmount" type="number" inputMode="numeric" step={1}
                   defaultValue={sp.amount ?? ""} placeholder={placeholders.amount}
                 className="min-h-touch w-full min-w-0 rounded-card border border-line bg-surface px-3 text-right text-title font-bold tabular-nums" />
        </label>

        <button type="submit" className="mt-1 min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
          {submitLabel}
        </button>
      </form>
    </Screen>
  );
}
