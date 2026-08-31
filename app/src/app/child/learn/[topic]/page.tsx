import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { currentChild } from "@/lib/session/current-child";
import { getLessonList } from "@/modules/learning";
import { quizTotal } from "@/modules/quiz";
import { consentRequired, noDevice, quizLabel, readLabel, tryTitle } from "../learn.fixture";

// LRN-001 — 한 영역의 학습 편 목록
const TOPICS: Record<string, Topic> = { earn: "EARN", spend: "SPEND", save: "SAVE" };

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

  const { lessons, quizCorrect } = await getLessonList(access.childId, topic);
  const allRead = lessons.every((l) => l.read);

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

      <div className="mt-3">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{tryTitle}</h2>
          <p className="mt-1 text-[0.88em] leading-relaxed">
            {lessons.find((l) => !l.read)?.tryIt ?? lessons[lessons.length - 1]?.tryIt}
          </p>
        </Card>
      </div>
    </Screen>
  );
}
