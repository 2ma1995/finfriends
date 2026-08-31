import { notFound } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { TOPIC_LABEL } from "@/contracts/learning";
import { currentChild } from "@/lib/session/current-child";
import { getLesson, getLessonList, nextLesson } from "@/modules/learning";
import { finishLessonAction } from "@/app/actions/learn";
import { consentRequired, finishLabel, lastFinishLabel, noDevice, tryTitle } from "../../learn.fixture";

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
  const at = lessons.findIndex((l) => l.id === lesson.id);
  const last = nextLesson(lesson.id) === null;

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
        <h2 className="ff-serif mt-2 text-center text-[1.15em] font-bold leading-snug">{lesson.title}</h2>
        <div className="mt-3 grid gap-2">
          {lesson.body.map((p) => (
            <p key={p} className="text-[0.95em] leading-relaxed text-ink-soft">{p}</p>
          ))}
        </div>
      </div>

      {/* 🔴 읽고 끝나면 그냥 글이다. 오늘 해볼 것 한 줄로 닫는다 */}
      <div className="mt-2">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{tryTitle}</h2>
          <p className="mt-1 text-[0.92em] font-bold leading-relaxed">{lesson.tryIt}</p>
        </Card>
      </div>

      <form action={finishLessonAction} className="mt-3">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <button className="min-h-touch w-full rounded-card bg-primary text-[0.92em] font-bold text-white">
          {last ? lastFinishLabel : finishLabel}
        </button>
      </form>
    </Screen>
  );
}
