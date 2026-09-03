import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { CATEGORIES } from "@/contracts/plan";
import { currentChild } from "@/lib/session/current-child";
import { getPlanCards } from "@/modules/plan";
import { getBalance } from "@/modules/allowance";
import { getUnmatched } from "@/modules/card";
import { recordActualAction } from "@/app/actions/plan";
import {
  amountLabel, byGuardianBadge, categoryLabel, consentRequired, empty, errors, hint,
  cardHint, cardMockBadge, cardTitle, metBadge, newLabel, noDevice, overBadge,
  recordLabel, recordTitle, savedNotice, sections, seeRetroLabel,
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
      <Screen title="계획 카드" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="📝" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  const [cards, allowance, txns] = await Promise.all([
    getPlanCards(access.childId),
    getBalance(access.childId),
    getUnmatched(access.childId),
  ]);
  const todo = cards.filter((c) => c.recordId === null);
  const done = cards.filter((c) => c.recordId !== null);

  return (
    <Screen title="계획 카드" sub={todo.length > 0 ? `${todo.length}개 맞춰볼 수 있어요` : undefined}
            back={{ href: "/child/home", label: "내 방" }}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-sub">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-sub">{errors[sp.error] ?? errors.NOT_FOUND}</p>
        </Card></div>
      ) : null}

      {/* 🔴 **누르는 것이라 배경을 깐다.** 테두리는 상태를 말할 때만 쓴다 */}
      <Link href="/child/allowance"
            className="mb-3 flex min-h-touch items-center justify-center gap-1.5 rounded-card bg-sand px-3 text-center">
        <b className="text-body">쓸 수 있는 용돈 {won(allowance)}</b>
        <span className="text-cap text-ink-mute">· 내 통장 →</span>
      </Link>

      <Link href="/child/plan/new"
            className="flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white">
        + {newLabel}
      </Link>

      {cards.length === 0 ? <div className="mt-3"><Empty emoji="📝" {...empty} /></div> : null}

      {/* 🔴 아직 안 맞춰본 것이 위다. 이게 이 화면의 존재 이유다 */}
      {todo.length > 0 ? (
        <>
          <h2 className="mb-2 mt-7 text-title font-bold leading-none">{sections.todo}</h2>
          <p className="mb-1.5 text-cap text-ink-mute">{hint}</p>
          <ul className="grid gap-2">
            {todo.map((c) => (
              <li key={c.id} className="rounded-card border border-primary-l bg-primary-bg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-body">{c.icon} {c.where}</b>
                  <b className="shrink-0 tabular-nums text-sub">{won(c.limitAmount)}</b>
                </div>
                <div className="mt-0.5 text-cap text-ink-mute">
                  {c.categoryLabel} · {c.whenLabel}
                  {c.items ? ` · ${c.items}` : ""}
                  {c.byGuardian ? ` · ${byGuardianBadge}` : ""}
                </div>

                <form action={recordActualAction} className="mt-2 grid gap-1.5">
                  <input type="hidden" name="planCardId" value={c.id} />
                  <span className="text-cap text-ink-mute">{recordTitle}</span>

                  <div className="flex gap-1.5">
                    {/* 🔴 `min-w-0` — 라벨이 자기 최소 폭(안의 숫자칸) 아래로 줄지 않으면
                           옆의 `shrink-0` 버튼이 화면 밖으로 밀린다. PIN 버튼과 같은 모양이다 */}
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">{amountLabel}</span>
                      {/* 🔴 D66 — `recordActual` 이 범위 밖을 `BAD_AMOUNT` 로 거절하고
                             「0원부터 1,000,000원까지 적을 수 있어요.」가 이 화면에 뜬다 */}
                      <input name="actualAmount" type="number" inputMode="numeric" step={1}
                             placeholder={String(c.limitAmount)}
                             className="min-h-touch w-full rounded-card border border-line bg-surface px-3 text-right text-body font-bold tabular-nums" />
                    </label>
                    <button className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-sub font-bold text-white">
                      {recordLabel}
                    </button>
                  </div>

                  {/* 🔴 업종이 달라도 별은 금액만 본다 (ADR-008). 여기서 고르는 건 회고 문장을 가를 뿐이다 */}
                  <span className="text-cap text-ink-mute">{categoryLabel}</span>
                  <ul className="grid grid-cols-4 gap-1">
                    {CATEGORIES.map((cat) => (
                      <li className="min-w-0" key={cat.code}>
                        <label className="block cursor-pointer">
                          <input type="radio" name="actualCategory" value={cat.code}
                                 defaultChecked={cat.label === c.categoryLabel} className="peer sr-only" />
                          <span className="grid min-h-touch place-items-center rounded-card border border-line bg-surface text-center text-micro peer-checked:border-primary peer-checked:bg-primary-bg peer-checked:font-bold">
                            <span className="text-[1.4em]">{cat.icon}</span>{cat.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </form>

                {/* 🔴 카드가 대신 적어 주지 않는다. 눌러서 채우고, 맞는지 아이가 본다 (D19) */}
                {txns.length > 0 ? (
                  <div className="mt-2 rounded-card border border-dashed border-line-2 p-2">
                    <div className="flex items-baseline justify-between">
                      <b className="text-cap text-ink-soft">{cardTitle}</b>
                      {txns[0].isMock ? (
                        <span className="text-micro text-ink-mute">{cardMockBadge}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-micro text-ink-mute">{cardHint}</p>
                    <ul className="mt-1.5 grid gap-1">
                      {txns.slice(0, 4).map((t) => (
                        <li key={t.id}>
                          <form action={recordActualAction} className="flex items-center gap-2">
                            <input type="hidden" name="planCardId" value={c.id} />
                            <input type="hidden" name="actualAmount" value={t.amount} />
                            <input type="hidden" name="actualCategory" value={t.category} />
                            <input type="hidden" name="cardTxnId" value={t.id} />
                            <button className="flex min-h-touch w-full items-center gap-2 rounded-card border border-line bg-surface px-2 text-left">
                              <span className="text-[1.1em]">{t.icon}</span>
                              <span className="flex-1 text-cap">{t.merchant}</span>
                              <span className="text-micro text-ink-mute">{t.whenLabel}</span>
                              <b className="tabular-nums text-sub">{won(t.amount)}</b>
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          <h2 className="mb-2 mt-7 text-title font-bold leading-none">{sections.done}</h2>
          <ul className="grid gap-1.5">
            {done.map((c) => (
              <li key={c.id}>
                {/* 🔴 **지킨 것에는 테두리를 안 두른다.** 선은 「넘겼다」를 말할 때만 쓴다 —
                    둘 다 두르면 어느 쪽이 다른 일인지 눈에 안 들어온다 */}
                <Link href={`/child/retro/${c.recordId}`}
                      className={`flex min-h-touch items-center gap-2.5 rounded-card px-3.5 py-2 ${
                        c.match === "MET" ? "bg-surface" : "border border-miss-line bg-miss-bg"}`}>
                  <span className="flex-1">
                    <b className="block text-sub">{c.icon} {c.where}</b>
                    <span className="text-cap text-ink-mute">{won(c.limitAmount)} · {c.whenLabel}</span>
                  </span>
                  <span className={`shrink-0 text-cap font-bold ${c.match === "MET" ? "text-primary-d" : "text-miss"}`}>
                    {c.match === "MET" ? metBadge : overBadge}
                  </span>
                  <span className="shrink-0 text-cap text-ink-mute">{seeRetroLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
