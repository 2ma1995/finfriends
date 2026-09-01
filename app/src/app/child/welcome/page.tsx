import Link from "next/link";
import { Screen, Empty } from "@/components/shared/Screen";
import { TOUR_STEPS } from "@/contracts/onboarding";
import { currentChild } from "@/lib/session/current-child";
import { getTourState } from "@/modules/onboarding";
import { getBalance } from "@/modules/star-ledger";
import { getMissionBoard } from "@/modules/mission";
import { advanceTourAction, finishTourAction, skipTourAction } from "@/app/actions/onboarding";
import {
  consentRequired, live, noDevice, nextLabel, prevLabel, skipLabel, startLabel, tour,
} from "./welcome.fixture";

// D13 — 아이 온보딩. 🔴 아이는 설명을 들은 적이 없다. 여기서 한 번 한다
export const metadata = { title: "처음이지? · 핀프렌즈" };

export default async function ChildWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="처음이지?">
        <Empty emoji="👋" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const saved = await getTourState(access.childId);
  // 🔴 URL 로 앞질러 갈 수 없다. 본 데까지만 열린다 — 별만 받아 가는 길을 막는다
  const asked = Number((await searchParams).step ?? saved.step) || 0;
  const step = Math.max(0, Math.min(asked, saved.step, TOUR_STEPS - 1));
  const s = tour[step];
  const last = step === TOUR_STEPS - 1;

  // 설명에 진짜 값을 끼워 넣는다. 없으면 남의 이야기가 된다
  let liveLine: string | null = null;
  if (s.live === "stars") liveLine = live.stars(await getBalance(access.childId));
  if (s.live === "missions") {
    const b = await getMissionBoard(access.childId);
    liveLine = live.missions(b.todo.length);
  }

  return (
    <Screen role="아이 화면" title="처음이지?" sub={`${step + 1} / ${TOUR_STEPS}`}>
      {/* 어디쯤 왔는지 — 숫자보다 점이 빠르다 */}
      <div className="flex justify-center gap-1.5">
        {tour.map((_, i) => (
          <span key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary-l" : "w-1.5 bg-line-2"}`} />
        ))}
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface px-4 py-7 text-center">
        <div className="text-[3.2em] leading-none">{s.emoji}</div>
        <h2 className="ff-serif mt-3 text-title font-bold leading-snug">{s.title}</h2>
        <div className="mt-2 grid gap-1">
          {s.lines.map((l) => (
            <p key={l} className={`text-body leading-relaxed ${
              l.startsWith("★") ? "font-bold text-star-d" : "text-ink-soft"}`}>{l}</p>
          ))}
        </div>
        {liveLine ? (
          <p className="mt-3 inline-block rounded-full bg-primary-bg px-3 py-1 text-sub font-bold text-primary-d">
            {liveLine}
          </p>
        ) : null}
      </div>

      {s.peek ? (
        <Link href={s.peek.href}
              className="mt-2 flex min-h-touch items-center justify-center rounded-card border border-dashed border-line-2 text-sub text-ink-soft">
          {s.peek.label} →
        </Link>
      ) : null}

      <div className="mt-3 flex gap-1.5">
        {step > 0 ? (
          <Link href={`/child/welcome?step=${step - 1}`}
                className="flex min-h-touch flex-1 items-center justify-center rounded-card border border-line-2 bg-surface text-sub text-ink-soft">
            {prevLabel}
          </Link>
        ) : null}

        {last ? (
          <form action={finishTourAction} className="flex-[2]">
            <button className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
              {startLabel}
            </button>
          </form>
        ) : (
          <form action={advanceTourAction} className="flex-[2]">
            <input type="hidden" name="to" value={step + 1} />
            <button className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
              {nextLabel}
            </button>
          </form>
        )}
      </div>

      {/* 🔴 가두지 않는다. 못 빠져나가는 화면이 첫 경험이 되면 안 된다 */}
      {!last ? (
        <form action={skipTourAction} className="mt-2">
          <button className="min-h-touch w-full text-sub text-ink-mute underline underline-offset-2">
            {skipLabel}
          </button>
        </form>
      ) : null}
    </Screen>
  );
}
