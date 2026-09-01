import { notFound } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { TOPIC_LABEL } from "@/contracts/learning";
import { currentChild } from "@/lib/session/current-child";
import { getLesson, getLessonList } from "@/modules/learning";
import { finishLessonAction } from "@/app/actions/learn";
import { consentRequired, finishLabel, lockedLesson, noDevice, tryTitle } from "../../learn.fixture";

// LRN-001 — 학습 한 편. 🔴 한 편은 화면 하나를 넘지 않는다
export default async function LessonPage({ params }: { params: Promise<{ topic: string; lessonId: string }> }) {
  const { topic: slug, lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson || lesson.topic.toLowerCase() !== slug) notFound();

  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="배우기" back={{ href: "/child/learn", label: "배우기" }}>
        <Empty emoji="📚" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const { lessons } = await getLessonList(access.childId, lesson.topic);

  /**
   * 🔴 **목록에서 회색으로 만든 것을 서버가 다시 본다** (SRS-Tech §6.6).
   *    화면만 감추면 주소를 직접 치는 것으로 그대로 열린다 — 하루 한 편이 아니게 된다.
   */
  const here = lessons.find((l) => l.id === lesson.id);
  if (here?.locked) {
    return (
      <Screen role="아이 화면" title={TOPIC_LABEL[lesson.topic]} back={{ href: `/child/learn/${slug}`, label: "목록" }}>
        <Empty emoji="🔒" title={lockedLesson.title} body={lockedLesson.body} />
      </Screen>
    );
  }

  const at = lessons.findIndex((l) => l.id === lesson.id);

  return (
    <Screen role="아이 화면" title={TOPIC_LABEL[lesson.topic]}
            sub={`${at + 1} / ${lessons.length}편`}
            back={{ href: `/child/learn/${slug}`, label: "목록" }}>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary-l"
             style={{ width: `${((at + 1) / lessons.length) * 100}%` }} />
      </div>

      <div className="rounded-card border border-line bg-surface px-4 py-5">
        <div className="text-center text-[2.6em] leading-none">{lesson.emoji}</div>
        <h2 className="ff-serif mt-2 text-center text-title font-bold leading-snug">{lesson.title}</h2>
        <div className="mt-3 grid gap-2">
          {lesson.body.map((p) => (
            <p key={p} className="text-body leading-relaxed text-ink-soft">{p}</p>
          ))}
        </div>
      </div>

      {/* 🔴 읽고 끝나면 그냥 글이다. 오늘 해볼 것 한 줄로 닫는다 */}
      <div className="mt-2">
        <Card tone="grow">
          <h2 className="text-cap tracking-[0.03em] text-primary-d">{tryTitle}</h2>
          <p className="mt-1 text-body font-bold leading-relaxed">{lesson.tryIt}</p>
        </Card>
      </div>

      <form action={finishLessonAction} className="mt-3">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <button className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
          {finishLabel}
        </button>
      </form>
    </Screen>
  );
}
