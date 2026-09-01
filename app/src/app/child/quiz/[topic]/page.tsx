import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { answeredToday, getQuiz, QUIZ_TOPICS, quizTitle, todayIndex } from "@/modules/quiz";
import { submitAnswer } from "@/app/actions/quiz";
import {
  backToPractice, consentRequired, correctLabel, doneToday, explainTitle,
  limitNotice, noDevice, starNotice, todayLabel, tomorrow, wrongLabel, wrongNotice, wrongPractice,
} from "./quiz.fixture";

// LRN-001 — 퀴즈. 🔴 맞히면 **별이 DB 에 남는다**
export const metadata = { title: "퀴즈 · 핀프렌즈" };
export function generateStaticParams() { return QUIZ_TOPICS.map((topic) => ({ topic })); }

export default async function ChildQuizPage({
  params, searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ r?: string; star?: string; limit?: string }>;
}) {
  const access = await currentChild();
  const { topic } = await params;
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="퀴즈" back={{ href: "/child/learn", label: "배우기" }}>
        <Empty emoji="❓" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const sp = await searchParams;
  /**
   * 🔴 **하루에 한 문제다.** 번호를 URL 로 고르게 두면 하루에 네 문제를 다 풀 수 있다 —
   *    「매일 조금씩」이 이 제품의 리듬인데 하루에 몰아 풀면 그 리듬이 사라진다.
   *    번호는 **날짜에서 계산한다**.
   */
  const q = getQuiz(topic, todayIndex(topic));
  const answered = sp.r === "o" || sp.r === "x";
  const correct = sp.r === "o";
  const alreadyDone = !answered && (await answeredToday(access.childId, topic));

  return (
    <Screen role="아이 화면" title={quizTitle(topic)} sub={todayLabel}
            back={{ href: "/child/practice", label: "실천하기" }}>
      {/* 🔴 오늘 이미 맞혔으면 다시 풀 게 없다. 같은 문제를 또 내면 별이 안 붙어 아이가 혼란스럽다 */}
      {alreadyDone ? (
        <>
          <Card tone="grow"><p className="text-body leading-relaxed">{doneToday}</p></Card>
          <Link href="/child/practice"
                className="mt-2 block min-h-touch rounded-card bg-primary text-center text-body font-bold leading-[44px] text-white">
            {backToPractice}
          </Link>
        </>
      ) : (
      <>

      <Card><p className="text-body font-bold leading-relaxed">{q.question}</p></Card>

      {!answered ? (
        <form action={submitAnswer} className="mt-2 grid gap-1.5">
          <input type="hidden" name="slug" value={topic} />
          <input type="hidden" name="n" value={q.index} />
          {q.choices.map((c) => (
            <button key={c.key} name="choice" value={c.key} type="submit"
                    className="flex min-h-touch w-full items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 text-left text-body">
              <span className="text-ink-mute">{c.key.toUpperCase()}</span>{c.text}
            </button>
          ))}
        </form>
      ) : (
        <>
          <div className={`mt-2 rounded-card border p-3 ${correct ? "border-primary-l/50 bg-primary-bg" : "border-miss-line bg-miss-bg"}`}>
            <b className={`text-body ${correct ? "text-primary-d" : "text-miss"}`}>
              {correct ? correctLabel : wrongLabel}
            </b>
            {/* 🔴 틀려도 별을 깎지 않는다. 그 사실을 화면에 적는다 */}
            {!correct ? (
              <>
                <p className="mt-1 text-sub text-ink-soft">{wrongNotice}</p>
                <p className="mt-0.5 text-sub font-bold text-primary-d">{wrongPractice}</p>
              </>
            ) : null}
            {sp.star ? <p className="mt-1 text-sub font-bold text-star-d">{starNotice}</p> : null}
            {/* 🔴 맞혔는데 한도라 못 받은 것 — 「틀렸다」와 갈라 말한다 */}
            {sp.limit ? <p className="mt-1 text-sub text-ink-soft">{limitNotice}</p> : null}
          </div>

          <div className="mt-2">
            <Card tone="grow">
              <h2 className="text-cap tracking-[0.03em] text-primary-d">{explainTitle}</h2>
              <p className="mt-1 text-sub leading-relaxed">{q.explain}</p>
            </Card>
          </div>

          {/* 🔴 「다음 문제」가 없다. 하루에 한 문제다 */}
          <p className="mt-2 text-center text-sub text-ink-mute">{tomorrow}</p>
          <Link href="/child/practice"
                className="mt-1 block min-h-touch rounded-card bg-primary text-center text-body font-bold leading-[44px] text-white">
            {backToPractice}
          </Link>
        </>
      )}
      </>
      )}
    </Screen>
  );
}
