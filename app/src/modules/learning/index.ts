import "server-only";
import { prisma } from "@/db";
import { isPracticeOpen, TOPIC_ICON, TOPIC_LABEL, type Topic, type TopicProgressView } from "@/contracts/learning";
import { LESSONS, findLesson, lessonsOf } from "@/contracts/lessons";
import { kstDay } from "@/modules/attendance";

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

/**
 * 한 영역의 편 목록 — 🔴 **오늘 읽을 수 있는 것은 하나다** (D47).
 *
 * 「매일 조금씩」이 이 제품의 리듬이다. 목록을 통째로 열어 두면 하루에 다 읽고,
 * 다 읽고 나면 **그 영역은 다음 날 열 이유가 없어진다.**
 *
 *   read     이미 읽은 편 — **다시 읽을 수 있다.** 복습을 막지 않는다
 *   today    오늘 읽을 한 편 — 안 읽은 것 중 **맨 앞** 하나
 *   locked   나머지 — 회색으로 보이되 **왜 잠겼는지** 화면이 말한다
 *
 * 🔴 **오늘 이미 새 편을 읽었으면 `today` 가 없다.** 그날은 읽기가 끝난 것이고
 *    남은 것은 문제와 실천이다.
 */
export async function getLessonList(childId: string, topic: Topic, now = new Date()) {
  const row = await prisma.learningProgress.findUnique({
    where: { childId_topic: { childId, topic } },
    select: { completedLessons: true, quizCorrect: true, lastReadDay: true },
  });
  const done = new Set(row?.completedLessons ?? []);
  const readToday = row?.lastReadDay === kstDay(now);

  const all = lessonsOf(topic);
  const todayId = readToday ? null : (all.find((l) => !done.has(l.id))?.id ?? null);

  /**
   * 🔴 **며칠 뒤에 열리는지 센다.** 예전엔 잠긴 편이 **전부 「내일 열려요」**였다 —
   *    다섯 편이 남았는데 다섯 개가 다 내일 열린다고 말하면 거짓이고,
   *    아이는 내일 와서 하나만 열린 걸 보고 **말이 틀렸다는 걸 안다.**
   *
   *    하루에 한 편이므로 **안 읽은 것 중 몇 번째냐가 곧 며칠 뒤**다.
   *    오늘 몫이 남아 있으면 그 한 편은 오늘 것이고, 그다음이 1일 뒤다.
   */
  const queue = all.filter((l) => !done.has(l.id) && l.id !== todayId).map((l) => l.id);

  return {
    lessons: all.map((l) => {
      const read = done.has(l.id);
      const at = queue.indexOf(l.id);
      return {
        ...l, read,
        today: l.id === todayId,
        locked: !read && l.id !== todayId,
        /** 며칠 뒤에 열리나 — 잠긴 편만 값을 갖는다 */
        opensInDays: at >= 0 ? at + 1 : 0,
      };
    }),
    todayId,
    readToday,
    quizCorrect: row?.quizCorrect ?? 0,
  };
}

/**
 * 이 편을 지금 열어도 되나 — 🔴 **화면과 서버가 같은 답을 내야 한다.**
 *    목록에서 회색으로 만들어도 주소를 직접 치면 그대로 열린다 (SRS-Tech §6.6).
 */
export async function canOpenLesson(childId: string, lessonId: string, now = new Date()) {
  const lesson = findLesson(lessonId);
  if (!lesson) return false;
  const { lessons } = await getLessonList(childId, lesson.topic, now);
  const l = lessons.find((x) => x.id === lessonId);
  return l ? !l.locked : false;
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
  // 🔴 **새 편을 읽은 날만 찍는다.** 다시 읽기는 위에서 이미 돌아갔으므로 여기 안 온다 —
  //    복습으로 날짜가 밀리면 「오늘 읽을 편」이 영영 안 나온다
  const day = kstDay();
  await prisma.learningProgress.upsert({
    where: { childId_topic: { childId, topic: lesson.topic } },
    create: { childId, topic: lesson.topic, completedLessons: next, completedCount: next.length, lastReadDay: day },
    update: { completedLessons: next, completedCount: next.length, lastReadDay: day },
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
