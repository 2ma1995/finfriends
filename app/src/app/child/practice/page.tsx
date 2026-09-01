import Link from "next/link";
import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getTodayBoard } from "@/modules/practice";
import { getMissionBoard } from "@/modules/mission";
import { hasPlanToday } from "@/modules/plan";
import { claimPracticeAction } from "@/app/actions/learn";
import {
  claim, claimed, comeTomorrow, consentRequired, creditsLabel, creditsNone,
  done, hint, intro, lessonWaiting,
  missionDiff, missionNone, needsLesson, noDevice, nudge,
  practicedToday as practicedTodayLabel, quizDone, quizRule, quizToday,
  readFirst, rejected, savingsCta, savingsNone, savingsStage, sub, title, waiting,
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

  /**
   * 🔴 **벌기·쓰기는 「배운 것 해보기」와 다른 일이다.**
   *    벌기는 **부모가 걸어 둔 미션**이고 쓰기는 **나가기 전에 세우는 계획**이다 —
   *    둘 다 미루면 그날이 그냥 지나간다. 남아 있으면 칸이 둠칫둠칫 움직인다.
   */
  const [cells, board, plannedToday, sp] = await Promise.all([
    getTodayBoard(access.childId),
    getMissionBoard(access.childId),
    hasPlanToday(access.childId),
    searchParams,
  ]);
  const missionsLeft = board.todo.length;

  return (
    <Screen role="아이 화면" title={title} sub={sub} back={{ href: "/child/learn", label: "배우기" }}>
      {sp.claimed ? (
        <p className="mb-2 rounded-card border border-star bg-star-bg px-3 py-2 text-center text-[0.86em] font-bold text-star-d">
          {claimed}
        </p>
      ) : null}
      {/* 🔴 **미션과 실천이 아이 눈에 똑같다.** 들어오자마자 다르다고 말한다 */}
      <p className="mb-2 text-[0.78em] leading-relaxed text-ink-mute">{intro}</p>

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
              {/* 🔴 **네 칸이 같은 말을 한다.** 나무가 세는 값과 같은 값이다 —
                     미션이든 회고든 위시리스트든 저금이든, 쌓였으면 여기 보인다 */}
              <div className={`text-[0.62em] leading-none ${
                c.credits > 0 ? "font-bold text-primary-d" : "text-ink-mute"}`}>
                {c.credits > 0 ? creditsLabel.replace("{n}", String(c.credits)) : creditsNone}
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
                  {/* 🔴 다른 셋처럼 **어디까지 왔는지** 먼저 말한다 */}
                  {c.savingsStage === "GOING" || c.savingsStage === "ASKED" ? (
                    <p className={`mt-1.5 text-[0.76em] font-bold ${
                      c.savingsStage === "GOING" ? "text-primary-d" : "text-star-d"}`}>
                      {savingsStage[c.savingsStage]}
                    </p>
                  ) : null}
                  <p className="mt-1 flex-1 text-[0.78em] leading-relaxed">
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
                  {/* 🔴 **오늘 몫은 끝났다** (D47). 다음 편 버튼을 그리면 눌러도 서버가 막는다 —
                         눌리지 않는 버튼이 제일 나쁘다. 「그만해」가 아니라 「내일 또」로 닫는다 */}
                  {c.practicedToday && c.state !== "WAITING" && c.state !== "DONE" ? (
                    <p className="mt-1 grid min-h-touch place-items-center text-center text-[0.74em] leading-tight text-primary-d">
                      <b>✓ {practicedTodayLabel}</b>
                      <span className="text-[0.9em] text-ink-mute">{comeTomorrow}</span>
                    </p>
                  ) : c.state === "WAITING" ? (
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

              {/*
                🔴 **넷 중 둘만 흔든다.** 넷 다 흔들면 아무것도 안 흔드는 것과 같다.
                   벌기 — 부모가 걸어 둔 미션이 남았을 때
                   쓰기 — 오늘 세운 계획이 없을 때
                   `transform` 만 쓰므로 옆 칸을 밀지 않는다 (`.ff-nudge`)
              */}
              {/* 🔴 **미션 입구는 여기 하나다.** 예전엔 화면 아래에도 같은 링크가 있어서
                     🎯 버튼이 둘이었다 — 아이는 둘이 다른 곳인 줄 안다.
                     남았으면 흔들고, 없으면 가만히 있지만 **자리는 늘 같다** */}
              {c.topic === "EARN" ? (
                missionsLeft > 0 ? (
                  <Link href="/child/missions"
                        className="ff-nudge mt-1.5 grid min-h-touch place-items-center rounded-card border border-star bg-star-bg text-[0.78em] font-bold text-star-d">
                    🎯 {nudge.earn.replace("{n}", String(missionsLeft))}
                  </Link>
                ) : (
                  <Link href="/child/missions"
                        className="mt-1.5 grid min-h-touch place-items-center rounded-card border border-line-2 bg-surface text-[0.74em] text-ink-soft">
                    🎯 {missionNone}
                  </Link>
                )
              ) : c.topic === "SPEND" && !plannedToday ? (
                <Link href="/child/plan/new"
                      className="ff-nudge mt-1.5 grid min-h-touch place-items-center rounded-card border border-star bg-star-bg text-[0.78em] font-bold text-star-d">
                  📝 {nudge.spend}
                </Link>
              ) : null}

              {/* 🔴 **읽기가 실천보다 먼저다.** 오늘 읽을 편이 남았으면 그렇게 말한다 (D47) */}
              {!c.needsLesson && !c.viaSavings && c.lessonToday ? (
                <Link href={`/child/learn/${slug}`}
                      className="mt-1.5 grid min-h-touch place-items-center rounded-card border border-primary-l bg-primary-bg text-[0.72em] font-bold text-primary-d">
                  📖 {lessonWaiting}
                </Link>
              ) : null}

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
      {/* 🔴 「오늘의 문제」가 넷인 이유 — `FR-011` 분야별 1일 1개 · 총 4개 */}
      <p className="mt-1 text-center text-[0.74em] text-ink-mute">{quizRule}</p>
      {/* 🔴 미션이 왜 다른지 — 아이에게 제일 큰 차이는 **돈이 붙는다**는 것이다 */}
      <p className="mt-1 text-center text-[0.74em] text-primary-d">🎯 {missionDiff}</p>
    </Screen>
  );
}
