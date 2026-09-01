import "server-only";
import { lessonsOf } from "@/contracts/lessons";
import { isPracticeOpen, TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { practicedToday } from "@/modules/mission";
import { getLessonList } from "@/modules/learning";
import { getPracticeState, type PracticeState } from "@/modules/mission";
import { getOpen } from "@/modules/savings";
import { answeredToday, todayIndex } from "@/modules/quiz";

/**
 * 오늘의 실천 — 네 영역을 한 화면에 놓는다.
 *
 * 🔴 **영역마다 하나씩만 보여준다.** 읽은 편의 실천을 전부 늘어놓으면 아이는
 *    무엇부터 할지 모른다. 「오늘 이거 하나」가 실천을 만든다.
 *
 * 🔴 **「불리기」의 실천은 적금이다.** 다른 셋과 달리 미션 승인이 아니라
 *    저금 약속으로 이뤄진다 (D25). 그래서 칸이 가리키는 곳이 다르다.
 */

export type PracticeCell = {
  readonly topic: Topic;
  readonly label: string;
  readonly icon: string;
  /** 오늘 할 일 한 줄. 없으면 아직 배울 게 남았다 */
  readonly task: string | null;
  readonly lessonId: string | null;
  readonly state: PracticeState;
  /** 실천이 아직 안 열린 영역 — 불리기는 적금으로 연결된다 */
  readonly viaSavings: boolean;
  /** 적금 쪽 한 줄 (불리기 칸) */
  readonly savingsNote: string | null;
  /** 오늘 퀴즈를 이미 맞혔나 */
  readonly quizDone: boolean;
  readonly quizIndex: number;
  /** 아직 아무 편도 안 읽었다 — 먼저 배워야 한다 */
  readonly needsLesson: boolean;
  /** 🔴 이 영역에서 **오늘 실천을 이미 올렸다** — 하루 하나다 (D47) */
  readonly practicedToday: boolean;
  /** 🔴 오늘 읽을 편이 남았나 — 읽을거리도 하루 하나다 (D47) */
  readonly lessonToday: boolean;
};

const ORDER: readonly Topic[] = ["EARN", "SPEND", "SAVE", "GROW"];
const SLUG: Record<Topic, string> = { EARN: "earn", SPEND: "spend", SAVE: "save", GROW: "grow" };

export async function getTodayBoard(childId: string): Promise<PracticeCell[]> {
  const savings = await getOpen(childId);

  return Promise.all(ORDER.map(async (topic) => {
    const slug = SLUG[topic];
    const [{ lessons, todayId }, quizDone] = await Promise.all([
      getLessonList(childId, topic),
      answeredToday(childId, slug),
    ]);

    const read = lessons.filter((l) => l.read);
    const base = {
      topic, label: TOPIC_LABEL[topic], icon: TOPIC_ICON[topic],
      quizDone, quizIndex: todayIndex(slug),
      needsLesson: read.length === 0,
      // 🔴 읽을거리 · 문제 · 실천 **각각 하루 하나**가 이 제품의 리듬이다 (D47)
      practicedToday: await practicedToday(childId, topic),
      lessonToday: todayId !== null,
    };

    // 🔴 불리기는 미션이 아니라 **적금**으로 실천한다
    if (!isPracticeOpen(topic)) {
      return {
        ...base, task: null, lessonId: null, state: "NONE" as PracticeState,
        viaSavings: true,
        savingsNote: savings === null ? null
          : savings.state === "REQUESTED" ? "부모님이 보고 계세요"
          : savings.kind === "INSTALLMENT"
            ? (savings.fullyPaid ? "다 넣었어요" : savings.paidThisWeek ? "이번 주는 넣었어요" : "이번 주 넣을 차례예요")
            : "저금하는 중이에요",
      };
    }

    // 🔴 **아직 안 한 것 하나**만 고른다. 다 했으면 마지막 것을 보여준다
    const states = await Promise.all(read.map(async (l) => [l, await getPracticeState(childId, l.id)] as const));
    const todo = states.find(([, st]) => st === "NONE" || st === "REJECTED");
    const picked = todo ?? states[states.length - 1] ?? null;

    return {
      ...base,
      task: picked ? picked[0].tryIt : (lessonsOf(topic)[0]?.tryIt ?? null),
      lessonId: picked ? picked[0].id : null,
      state: picked ? picked[1] : ("NONE" as PracticeState),
      viaSavings: false,
      savingsNote: null,
    };
  }));
}
