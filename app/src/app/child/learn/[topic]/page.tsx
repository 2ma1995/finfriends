import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen, Empty } from "@/components/shared/Screen";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { currentChild } from "@/lib/session/current-child";
import { getLessonList } from "@/modules/learning";

import { quizTotal } from "@/modules/quiz";
import { consentRequired, dailyRule, lockedBadge, noDevice, practiceCta, practiceHint,
         quizLabel, readDoneToday, readLabel, todayBadge } from "../learn.fixture";

// LRN-001 — 한 영역의 학습 편 목록
const TOPICS: Record<string, Topic> = { earn: "EARN", spend: "SPEND", save: "SAVE", grow: "GROW" };

export default async function LearnTopicPage({ params }: { params: Promise<{ topic: string }> }) {
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

  const { lessons, quizCorrect, readToday } = await getLessonList(access.childId, topic);
  const allRead = lessons.every((l) => l.read);


  return (
    <Screen role="아이 화면" title={`${TOPIC_ICON[topic]} ${TOPIC_LABEL[topic]}`}
            sub={`${lessons.filter((l) => l.read).length} / ${lessons.length}편`}
            back={{ href: "/child/learn", label: "배우기" }}>
      {/* 🔴 오늘 몫을 다 했으면 먼저 말한다 — 목록만 회색이면 「고장났나」로 읽힌다 */}
      {readToday ? (
        <p className="mb-2 rounded-card border border-primary-l bg-primary-bg px-3 py-2 text-center text-sub font-bold text-primary-d">
          {readDoneToday}
        </p>
      ) : null}

      <ol className="grid gap-1.5">
        {lessons.map((l, i) => {
          const body = (
            <>
              <span className={`text-[1.3em] ${l.locked ? "opacity-40 grayscale" : ""}`}>{l.emoji}</span>
              <span className="flex-1">
                <b className={`block text-sub ${l.locked ? "text-ink-mute" : ""}`}>{l.title}</b>
                <span className="text-cap text-ink-mute">
                  {i + 1}편{l.today ? ` · ${todayBadge}` : l.locked ? ` · ${lockedBadge(l.opensInDays)}` : ""}
                </span>
              </span>
              {l.read ? <span className="text-cap text-primary-d">✓ {readLabel}</span>
                      : l.locked ? <span className="text-body">🔒</span> : null}
            </>
          );
          /*
            🔴 **잠긴 편은 링크가 아니다.** 회색으로만 칠하고 링크를 두면 눌리고,
               눌러서 열리면 하루 한 편이 아니게 된다. 주소로 직접 와도
               상세 화면이 서버에서 다시 막는다 (§6.6).
          */
          return (
            <li key={l.id}>
              {l.locked ? (
                <div aria-disabled className="flex min-h-touch items-center gap-2 rounded-card border border-dashed border-line-2 bg-transparent px-3 py-2">
                  {body}
                </div>
              ) : (
                <Link href={`/child/learn/${slug}/${l.id}`}
                      className={`flex min-h-touch items-center gap-2 rounded-card border px-3 py-2 ${
                        l.read ? "border-line bg-surface" : "border-primary-l bg-primary-bg"}`}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 text-center text-cap text-ink-mute">{dailyRule}</p>

      {/* 🔴 퀴즈는 **읽은 다음**에 온다. 배우기 화면이 곧장 퀴즈로 뛰던 것이 이 화면의 오류였다 */}
      <Link href={`/child/quiz/${slug}?n=1`}
            className={`mt-3 flex min-h-touch items-center justify-center rounded-card text-body font-bold ${
              allRead ? "bg-primary text-white" : "border border-line-2 bg-surface text-ink-soft"}`}>
        {quizLabel} · {quizCorrect} / {quizTotal(slug)}개 맞힘
      </Link>

      {/* 🔴 실천은 **한 화면에 모아 둔다** — 영역마다 흩어 놓으면 아이는
          네 군데를 돌아다녀야 하고, 그러면 오늘 무엇을 할지 못 고른다 */}
      <Link href="/child/practice"
            className="mt-4 flex min-h-touch w-full items-center justify-center rounded-card border-2 border-primary bg-primary-bg text-body font-bold text-primary-d">
        ✋ {practiceCta}
      </Link>
      <p className="mt-1 text-center text-cap text-ink-mute">{practiceHint}</p>

    </Screen>
  );
}
