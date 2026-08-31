import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getQuiz, QUIZ_TOPICS, quizTitle } from "@/modules/quiz";
import { submitAnswer } from "@/app/actions/quiz";
import {
  backToTopic, consentRequired, correctLabel, doneLabel, explainTitle, nextLabel,
  noDevice, retryLabel, starNotice, wrongLabel, wrongNotice,
} from "./quiz.fixture";

// LRN-001 — 퀴즈. 🔴 맞히면 **별이 DB 에 남는다**
export const metadata = { title: "퀴즈 · 핀프렌즈" };
export function generateStaticParams() { return QUIZ_TOPICS.map((topic) => ({ topic })); }

export default async function ChildQuizPage({
  params, searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ n?: string; r?: string; star?: string }>;
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
  // 🔴 문항 번호와 총 수를 지어내지 않는다. 총 수는 문항 은행이 센다
  const q = getQuiz(topic, Number(sp.n ?? 1));
  const answered = sp.r === "o" || sp.r === "x";
  const correct = sp.r === "o";
  const last = q.index >= q.total;

  return (
    <Screen role="아이 화면" title={quizTitle(topic)} sub={`${q.index} / ${q.total}문제`}
            back={{ href: `/child/learn/${topic}`, label: "목록" }}>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary-l" style={{ width: `${(q.index / q.total) * 100}%` }} />
      </div>

      <Card><p className="text-[1em] font-bold leading-relaxed">{q.question}</p></Card>

      {!answered ? (
        <form action={submitAnswer} className="mt-2 grid gap-1.5">
          <input type="hidden" name="slug" value={topic} />
          <input type="hidden" name="n" value={q.index} />
          {q.choices.map((c) => (
            <button key={c.key} name="choice" value={c.key} type="submit"
                    className="flex min-h-touch w-full items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 text-left text-[0.9em]">
              <span className="text-ink-mute">{c.key.toUpperCase()}</span>{c.text}
            </button>
          ))}
        </form>
      ) : (
        <>
          <div className={`mt-2 rounded-card border p-3 ${correct ? "border-primary-l/50 bg-primary-bg" : "border-miss-line bg-miss-bg"}`}>
            <b className={`text-[0.92em] ${correct ? "text-primary-d" : "text-miss"}`}>
              {correct ? correctLabel : wrongLabel}
            </b>
            {/* 🔴 틀려도 별을 깎지 않는다. 그 사실을 화면에 적는다 */}
            {!correct ? <p className="mt-1 text-[0.84em] text-ink-soft">{wrongNotice}</p> : null}
            {sp.star ? <p className="mt-1 text-[0.86em] font-bold text-star-d">{starNotice}</p> : null}
          </div>

          <div className="mt-2">
            <Card tone="grow">
              <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{explainTitle}</h2>
              <p className="mt-1 text-[0.88em] leading-relaxed">{q.explain}</p>
            </Card>
          </div>

          {/* 🔴 틀린 문제는 다시 풀 수 있다. 넘겨 버리면 배운 게 없다 */}
          {!correct ? (
            <Link href={`/child/quiz/${topic}?n=${q.index}`}
                  className="mt-2 block min-h-touch rounded-card border border-line-2 bg-surface text-center text-[0.86em] leading-[44px] text-ink-soft">
              {retryLabel}
            </Link>
          ) : null}

          <Link href={last ? `/child/learn/${topic}` : `/child/quiz/${topic}?n=${q.index + 1}`}
                className="mt-2 block min-h-touch rounded-card bg-primary text-center text-[0.9em] font-bold leading-[44px] text-white">
            {last ? doneLabel : nextLabel}
          </Link>

          {last ? (
            <Link href="/child/learn"
                  className="mt-2 block min-h-touch text-center text-[0.78em] leading-[44px] text-ink-mute underline underline-offset-2">
              {backToTopic}
            </Link>
          ) : null}
        </>
      )}
    </Screen>
  );
}
