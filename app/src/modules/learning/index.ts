import "server-only";
import { prisma } from "@/db";
import { TOPIC_ICON, TOPIC_LABEL, type Topic, type TopicProgressView } from "@/contracts/learning";

/**
 * 학습 진도 — LRN-001 슬라이스.
 *
 * 🔴 **4영역은 고정이다.** DB 에 행이 없어도 4개를 다 돌려준다 —
 *    화면이 「아직 시작 안 한 영역」과 「없는 영역」을 구별해야 하기 때문이다 (§6.2.1).
 * 🔴 **불리기(GROW)는 실천 경로가 미개통**이라 잠긴 상태로 나간다.
 */

const ORDER: Topic[] = ["EARN", "SPEND", "SAVE", "GROW"];
/** 영역당 학습 편수 — 콘텐츠가 DAT-003 으로 들어오면 그때 DB 를 본다 */
const TOTAL_PER_TOPIC = 3;

export async function getTopicProgress(childId: string): Promise<TopicProgressView[]> {
  const rows = await prisma.learningProgress.findMany({
    where: { childId },
    select: { topic: true, completedCount: true, quizCorrect: true },
  });
  const byTopic = new Map(rows.map((r) => [r.topic as Topic, r]));

  return ORDER.map((topic) => {
    const r = byTopic.get(topic);
    return {
      topic,
      label: TOPIC_LABEL[topic],
      icon: TOPIC_ICON[topic],
      completed: r?.completedCount ?? 0,
      total: TOTAL_PER_TOPIC,
      quizCorrect: r?.quizCorrect ?? 0,
      locked: topic === "GROW",
    };
  });
}
