import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { CATEGORIES } from "@/contracts/plan";
import { currentChild } from "@/lib/session/current-child";
import { getPlanCards, MAX_ACTUAL } from "@/modules/plan";
import { recordActualAction } from "@/app/actions/plan";
import {
  amountLabel, byGuardianBadge, categoryLabel, consentRequired, empty, errors, hint,
  metBadge, newLabel, noDevice, overBadge, recordLabel, recordTitle, savedNotice, sections, seeRetroLabel,
} from "./plan-list.fixture";

// PLN-002 — 적어둔 계획 목록. 🔴 맞춰보지 않으면 계획 카드는 그냥 메모다
export const metadata = { title: "계획 카드 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildPlanListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="계획 카드" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="📝" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const cards = await getPlanCards(access.childId);
  const todo = cards.filter((c) => c.recordId === null);
  const done = cards.filter((c) => c.recordId !== null);

  return (
    <Screen role="아이 화면" title="계획 카드" sub={todo.length > 0 ? `${todo.length}개 맞춰볼 수 있어요` : undefined}
            back={{ href: "/child/home", label: "내 방" }}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-[0.88em]">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-[0.88em]">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}

      <Link href="/child/plan/new"
            className="flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white">
        + {newLabel}
      </Link>

      {cards.length === 0 ? <div className="mt-3"><Empty emoji="📝" {...empty} /></div> : null}

      {/* 🔴 아직 안 맞춰본 것이 위다. 이게 이 화면의 존재 이유다 */}
      {todo.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{sections.todo}</h2>
          <p className="mb-1.5 text-[0.74em] text-ink-mute">{hint}</p>
          <ul className="grid gap-2">
            {todo.map((c) => (
              <li key={c.id} className="rounded-card border border-primary-l bg-primary-bg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[0.9em]">{c.icon} {c.where}</b>
                  <b className="shrink-0 tabular-nums text-[0.88em]">{won(c.limitAmount)}</b>
                </div>
                <div className="mt-0.5 text-[0.72em] text-ink-mute">
                  {c.categoryLabel} · {c.whenLabel}
                  {c.items ? ` · ${c.items}` : ""}
                  {c.byGuardian ? ` · ${byGuardianBadge}` : ""}
                </div>

                <form action={recordActualAction} className="mt-2 grid gap-1.5">
                  <input type="hidden" name="planCardId" value={c.id} />
                  <span className="text-[0.74em] text-ink-mute">{recordTitle}</span>

                  <div className="flex gap-1.5">
                    <label className="flex-1">
                      <span className="sr-only">{amountLabel}</span>
                      <input name="actualAmount" type="number" inputMode="numeric"
                             min={0} max={MAX_ACTUAL} step={1} required placeholder={String(c.limitAmount)}
                             className="min-h-touch w-full rounded-card border border-line bg-surface px-3 text-right text-[0.92em] font-bold tabular-nums" />
                    </label>
                    <button className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-[0.82em] font-bold text-white">
                      {recordLabel}
                    </button>
                  </div>

                  {/* 🔴 업종이 달라도 별은 금액만 본다 (ADR-008). 여기서 고르는 건 회고 문장을 가를 뿐이다 */}
                  <span className="text-[0.7em] text-ink-mute">{categoryLabel}</span>
                  <ul className="grid grid-cols-4 gap-1">
                    {CATEGORIES.map((cat) => (
                      <li key={cat.code}>
                        <label className="block cursor-pointer">
                          <input type="radio" name="actualCategory" value={cat.code}
                                 defaultChecked={cat.label === c.categoryLabel} className="peer sr-only" />
                          <span className="grid min-h-touch place-items-center rounded-card border border-line bg-surface text-center text-[0.64em] peer-checked:border-primary peer-checked:bg-primary-bg peer-checked:font-bold">
                            <span className="text-[1.4em]">{cat.icon}</span>{cat.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{sections.done}</h2>
          <ul className="grid gap-1.5">
            {done.map((c) => (
              <li key={c.id}>
                <Link href={`/child/retro/${c.recordId}`}
                      className={`flex min-h-touch items-center gap-2 rounded-card border px-3 py-2 ${
                        c.match === "MET" ? "border-line bg-surface" : "border-miss-line bg-miss-bg"}`}>
                  <span className="flex-1">
                    <b className="block text-[0.86em]">{c.icon} {c.where}</b>
                    <span className="text-[0.72em] text-ink-mute">{won(c.limitAmount)} · {c.whenLabel}</span>
                  </span>
                  <span className={`shrink-0 text-[0.74em] font-bold ${c.match === "MET" ? "text-primary-d" : "text-miss"}`}>
                    {c.match === "MET" ? metBadge : overBadge}
                  </span>
                  <span className="shrink-0 text-[0.72em] text-ink-mute">{seeRetroLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
