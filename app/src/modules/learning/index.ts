import "server-only";
import { prisma } from "@/db";
import { isPracticeOpen, TOPIC_ICON, TOPIC_LABEL, type Topic, type TopicProgressView } from "@/contracts/learning";
import { LESSONS, findLesson, lessonsOf } from "@/contracts/lessons";

/**
 * 학습 진도 — LRN-001.
 *
 * 🔴 **4영역은 고정이다.** DB 에 행이 없어도 4개를 다 돌려준다 —
 *    화면이 「아직 시작 안 한 영역」과 「없는 영역」을 구별해야 한다 (§6.2.1).
 * 🔴 **불리기(GROW)는 배우는 건 열리고 실천만 닫힌다** (AC-2.4).
 *    실천이 닫힌 이유는 그 영역의 실천이 **적금 가입~만기**여서, 실제 금융상품 없이는
 *    인정할 수 없기 때문이다. 영역 전체를 잠그면 **아이가 배울 기회조차 없어진다.**
 * 🔴 **진도는 읽은 편의 목록에서 센다.** 개수만 세면 같은 편을 다시 읽어도 오른다.
 */

const ORDER: Topic[] = ["EARN", "SPEND", "SAVE", "GROW"];

export async function getTopicProgress(childId: string): Promise<TopicProgressView[]> {
  const rows = await prisma.learningProgress.findMany({
    where: { childId },
    select: { topic: true, completedLessons: true, quizCorrect: true },
  });
  const byTopic = new Map(rows.map((r) => [r.topic as Topic, r]));

  return ORDER.map((topic) => {
    const r = byTopic.get(topic);
    const all = lessonsOf(topic);
    const done = (r?.completedLessons ?? []).filter((id) => all.some((l) => l.id === id));
    return {
      topic,
      label: TOPIC_LABEL[topic],
      icon: TOPIC_ICON[topic],
      completed: done.length,
      total: all.length,
      quizCorrect: r?.quizCorrect ?? 0,
      practiceOpen: isPracticeOpen(topic),
    };
  });
}

/** 한 영역의 편 목록 — 어디까지 읽었는지 함께 준다 */
export async function getLessonList(childId: string, topic: Topic) {
  const row = await prisma.learningProgress.findUnique({
    where: { childId_topic: { childId, topic } },
    select: { completedLessons: true, quizCorrect: true },
  });
  const done = new Set(row?.completedLessons ?? []);
  return {
    lessons: lessonsOf(topic).map((l) => ({ ...l, read: done.has(l.id) })),
    quizCorrect: row?.quizCorrect ?? 0,
  };
}

export function getLesson(id: string) {
  return findLesson(id);
}

/**
 * 「다 읽었어요」 — 🔴 **같은 편을 다시 읽어도 진도가 오르지 않는다.**
 *    별은 주지 않는다. 읽기만으로 별을 주면 아이는 넘기기만 한다 (SRS 트리거에도 없다).
 */
export async function markLessonRead(childId: string, lessonId: string) {
  const lesson = findLesson(lessonId);
  if (!lesson) return false;

  const row = await prisma.learningProgress.findUnique({
    where: { childId_topic: { childId, topic: lesson.topic } },
    select: { completedLessons: true },
  });
  const done = new Set(row?.completedLessons ?? []);
  if (done.has(lessonId)) return true;   // 다시 읽음 — 정상이다. 오류가 아니다
  done.add(lessonId);

  const next = Array.from(done);
  await prisma.learningProgress.upsert({
    where: { childId_topic: { childId, topic: lesson.topic } },
    create: { childId, topic: lesson.topic, completedLessons: next, completedCount: next.length },
    update: { completedLessons: next, completedCount: next.length },
  });
  return true;
}

/** 이 편 다음에 읽을 것 — 없으면 null (퀴즈로 간다) */
export function nextLesson(id: string) {
  const cur = findLesson(id);
  if (!cur) return null;
  const list = lessonsOf(cur.topic);
  return list[list.findIndex((l) => l.id === id) + 1] ?? null;
}

export const ALL_LESSONS = LESSONS;
