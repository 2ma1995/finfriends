import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { isPracticeOpen, TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { currentChild } from "@/lib/session/current-child";
import { getLessonList } from "@/modules/learning";
import { getPracticeState } from "@/modules/mission";
import { claimPracticeAction } from "@/app/actions/learn";
import { quizTotal } from "@/modules/quiz";
import { consentRequired, noDevice, practice, practiceSoonBody, practiceSoonLabel,
         quizLabel, readLabel, tryTitle } from "../learn.fixture";

// LRN-001 — 한 영역의 학습 편 목록
const TOPICS: Record<string, Topic> = { earn: "EARN", spend: "SPEND", save: "SAVE", grow: "GROW" };

export default async function LearnTopicPage({
  params, searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ claimed?: string }>;
}) {
  const { topic: slug } = await params;
  const topic = TOPICS[slug];
  if (!topic) notFound();

  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={TOPIC_LABEL[topic]} back={{ href: "/child/learn", label: "배우기" }}>
        <Empty emoji="📚" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const { lessons, quizCorrect } = await getLessonList(access.childId, topic);
  const allRead = lessons.every((l) => l.read);

  // 🔴 읽은 편의 실천만 보여준다. 안 읽은 것의 「해봤어요」를 먼저 누르게 하면
  //    배우기를 건너뛰고 별만 받아 가는 길이 된다
  const readLessons = lessons.filter((l) => l.read);
  const claimedId = (await searchParams).claimed ?? null;
  const states = Object.fromEntries(
    await Promise.all(readLessons.map(async (l) => [l.id, await getPracticeState(access.childId, l.id)] as const)),
  );

  return (
    <Screen role="아이 화면" title={`${TOPIC_ICON[topic]} ${TOPIC_LABEL[topic]}`}
            sub={`${lessons.filter((l) => l.read).length} / ${lessons.length}편`}
            back={{ href: "/child/learn", label: "배우기" }}>
      <ol className="grid gap-1.5">
        {lessons.map((l, i) => (
          <li key={l.id}>
            <Link href={`/child/learn/${slug}/${l.id}`}
                  className={`flex min-h-touch items-center gap-2 rounded-card border px-3 py-2 ${
                    l.read ? "border-line bg-surface" : "border-primary-l bg-primary-bg"}`}>
              <span className="text-[1.3em]">{l.emoji}</span>
              <span className="flex-1">
                <b className="block text-[0.88em]">{l.title}</b>
                <span className="text-[0.72em] text-ink-mute">{i + 1}편</span>
              </span>
              {l.read ? <span className="text-[0.76em] text-primary-d">✓ {readLabel}</span> : null}
            </Link>
          </li>
        ))}
      </ol>

      {/* 🔴 퀴즈는 **읽은 다음**에 온다. 배우기 화면이 곧장 퀴즈로 뛰던 것이 이 화면의 오류였다 */}
      <Link href={`/child/quiz/${slug}?n=1`}
            className={`mt-3 flex min-h-touch items-center justify-center rounded-card text-[0.9em] font-bold ${
              allRead ? "bg-primary text-white" : "border border-line-2 bg-surface text-ink-soft"}`}>
        {quizLabel} · {quizCorrect} / {quizTotal(slug)}개 맞힘
      </Link>

      {/* 🔴 읽은 편마다 해볼 것이 하나씩 열린다. 별은 지식이 아니라 **행동**에 붙는다 (D16) */}
      <h2 className="mb-1.5 mt-4 text-[0.82em] font-bold">{tryTitle}</h2>
      {!isPracticeOpen(topic) ? (
        /* 🔴 배우는 건 열려 있다. 닫힌 것은 실천뿐이라는 걸 분명히 말한다 (AC-2.4) */
        <Card>
          <b className="text-[0.84em] text-ink-soft">{practiceSoonLabel}</b>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{practiceSoonBody}</p>
        </Card>
      ) : (
        <>
        <p className="mb-1.5 text-[0.74em] text-ink-mute">{practice.hint}</p>
      <ul className="grid gap-1.5">
        {readLessons.map((l) => {
          const st = states[l.id];
          return (
            <li key={l.id}
                className={`rounded-card border p-3 ${
                  st === "WAITING" ? "border-star bg-star-bg"
                  : st === "DONE" ? "border-primary-l/50 bg-primary-bg"
                  : st === "REJECTED" ? "border-miss-line bg-miss-bg"
                  : "border-line bg-surface"}`}>
              <p className="text-[0.88em] font-bold leading-relaxed">{l.tryIt}</p>
              {st === "WAITING" ? (
                <p className="mt-1 text-[0.78em] text-ink-soft">
                  {claimedId === l.id ? practice.claimed : practice.waiting} · {practice.waitingBody}
                </p>
              ) : st === "DONE" ? (
                <p className="mt-1 text-[0.8em] font-bold text-primary-d">{practice.done}</p>
              ) : (
                <>
                  {st === "REJECTED" ? (
                    <p className="mt-1 text-[0.78em] text-miss">{practice.rejected}</p>
                  ) : null}
                  <form action={claimPracticeAction} className="mt-2">
                    <input type="hidden" name="lessonId" value={l.id} />
                    <button className="min-h-touch w-full rounded-card bg-primary text-[0.86em] font-bold text-white">
                      {practice.claim} · ⭐ 1
                    </button>
                  </form>
                </>
              )}
            </li>
          );
        })}
      </ul>
        </>
      )}
    </Screen>
  );
}
