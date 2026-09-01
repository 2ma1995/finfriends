import Link from "next/link";
import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getTodayBoard } from "@/modules/practice";
import { claimPracticeAction } from "@/app/actions/learn";
import {
  claim, claimed, consentRequired, done, hint, needsLesson, noDevice, quizDone, quizToday,
  readFirst, rejected, savingsCta, savingsNone, sub, title, waiting,
} from "./practice.fixture";

// 오늘의 실천 — 네 영역을 한 화면에. 🔴 「오늘 하나」가 실천을 만든다
export const metadata = { title: "실천하기 · 핀프렌즈" };
const SLUG: Record<string, string> = { EARN: "earn", SPEND: "spend", SAVE: "save", GROW: "grow" };

export default async function ChildPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={title} back={{ href: "/child/learn", label: "배우기" }}>
        <Empty emoji="✋" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const [cells, sp] = await Promise.all([getTodayBoard(access.childId), searchParams]);

  return (
    <Screen role="아이 화면" title={title} sub={sub} back={{ href: "/child/learn", label: "배우기" }}>
      {sp.claimed ? (
        <p className="mb-2 rounded-card border border-star bg-star-bg px-3 py-2 text-center text-[0.86em] font-bold text-star-d">
          {claimed}
        </p>
      ) : null}
      {/* 🔴 네 영역을 **한 화면에 나란히** 둔다 — 무엇이 남았는지 한눈에 보여야 고른다 */}
      <ul className="grid grid-cols-2 gap-2">
        {cells.map((c) => {
          const slug = SLUG[c.topic];
          const tone =
            c.state === "WAITING" ? "border-star bg-star-bg"
            : c.state === "DONE" ? "border-primary-l/60 bg-primary-bg"
            : c.state === "REJECTED" ? "border-miss-line bg-miss-bg"
            : "border-line bg-surface";

          return (
            <li key={c.topic} className={`flex min-h-[168px] flex-col rounded-card border p-2.5 ${tone}`}>
              <div className="flex items-baseline gap-1">
                <span className="text-[1.1em]">{c.icon}</span>
                <b className="text-[0.82em]">{c.label}</b>
              </div>

              {/* 🔴 안 배웠으면 실천할 것이 없다. 배우러 보낸다 */}
              {c.needsLesson ? (
                <>
                  <p className="mt-1.5 flex-1 text-[0.78em] leading-relaxed text-ink-mute">{needsLesson}</p>
                  <Link href={`/child/learn/${slug}`}
                        className="mt-1 grid min-h-touch place-items-center rounded-card border border-line-2 bg-surface text-[0.76em] text-ink-soft">
                    {readFirst}
                  </Link>
                </>
              ) : c.viaSavings ? (
                /* 🔴 불리기는 미션이 아니라 저금으로 실천한다 (D25) */
                <>
                  <p className="mt-1.5 flex-1 text-[0.78em] leading-relaxed">
                    {c.savingsNote ?? savingsNone}
                  </p>
                  <Link href="/child/allowance"
                        className="mt-1 grid min-h-touch place-items-center rounded-card bg-primary text-[0.78em] font-bold text-white">
                    {savingsCta}
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-1.5 flex-1 text-[0.78em] font-bold leading-relaxed">{c.task}</p>
                  {c.state === "WAITING" ? (
                    <p className="mt-1 grid min-h-touch place-items-center text-[0.76em] text-ink-soft">{waiting}</p>
                  ) : c.state === "DONE" ? (
                    <p className="mt-1 grid min-h-touch place-items-center text-[0.76em] font-bold text-primary-d">{done}</p>
                  ) : (
                    <form action={claimPracticeAction} className="mt-1">
                      <input type="hidden" name="lessonId" value={c.lessonId ?? ""} />
                      <button className="min-h-touch w-full rounded-card bg-primary text-[0.8em] font-bold text-white">
                        {c.state === "REJECTED" ? rejected : claim} · ⭐1
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* 🔴 하루에 한 문제. 다 풀었으면 그렇게 말한다 */}
              <Link href={`/child/quiz/${slug}`}
                    className={`mt-1.5 grid min-h-touch place-items-center rounded-card border border-dashed text-[0.72em] ${
                      c.quizDone ? "border-line-2 text-ink-mute" : "border-primary-l text-primary-d"}`}>
                {c.quizDone ? quizDone : quizToday}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-center text-[0.78em] text-ink-mute">{hint}</p>
    </Screen>
  );
}
