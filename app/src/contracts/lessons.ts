import type { Topic } from "./learning";

/**
 * 학습 콘텐츠 — **코드다.** 아이템 카탈로그와 같은 이유로 DB 가 아니다.
 * 글이지 회원 데이터가 아니다. DB 는 **누가 무엇을 읽었는가**만 안다.
 *
 * 🔴 **초등 저학년이 읽는다.** 한 편은 화면 하나를 넘지 않는다.
 *    한 편에 한 가지만 말하고, 마지막은 **오늘 해볼 것 한 줄**로 끝낸다 —
 *    읽고 끝나면 이 제품의 규칙(실천 없이는 자라지 않는다)이 성립하지 않는다.
 */

export type Lesson = {
  readonly id: string;
  readonly topic: Topic;
  readonly title: string;
  readonly emoji: string;
  /** 한 문단씩. 길면 아이가 읽다 만다 */
  readonly body: readonly string[];
  /** 🔴 읽고 나서 오늘 해볼 것. 이게 없으면 그냥 글이다 */
  readonly tryIt: string;
};

export const LESSONS: readonly Lesson[] = [
  // 벌기
  { id: "earn-1", topic: "EARN", emoji: "💪", title: "돈은 그냥 생기지 않아",
    body: [
      "가게에 있는 물건은 누군가 만들었어요. 만든 사람은 그 일을 하고 돈을 받아요.",
      "돈은 어딘가에서 저절로 나오는 게 아니라, 누가 무언가를 해서 생기는 거예요.",
    ],
    tryIt: "오늘 우리 집에서 어른이 하는 일 하나를 찾아보세요." },
  { id: "earn-2", topic: "EARN", emoji: "🧹", title: "나도 벌 수 있어",
    body: [
      "집안일을 돕고 용돈을 받았다면, 그건 일해서 번 돈이에요.",
      "그냥 받은 돈과 벌어서 받은 돈은 느낌이 달라요. 벌어 본 돈은 쓸 때 더 생각하게 돼요.",
    ],
    tryIt: "오늘 도울 수 있는 집안일 하나를 정해 보세요." },
  { id: "earn-3", topic: "EARN", emoji: "⏳", title: "번 돈에는 시간이 들어 있어",
    body: [
      "30분 동안 도와서 1,000원을 벌었다면, 그 1,000원에는 내 30분이 들어 있어요.",
      "물건을 살 때 「이게 내 30분만큼 좋을까?」 생각해 보면 고르기가 쉬워져요.",
    ],
    tryIt: "갖고 싶은 것 하나가 내 시간으로 얼마인지 세어 보세요." },

  // 잘 쓰기
  { id: "spend-1", topic: "SPEND", emoji: "📝", title: "쓰기 전에 적어 두기",
    body: [
      "가게에 들어가기 전에 「얼마 쓸지」 먼저 적어 두면, 안에서 흔들리지 않아요.",
      "적어 두는 건 참으라는 뜻이 아니에요. 내가 먼저 정해 두는 거예요.",
    ],
    tryIt: "다음에 나갈 때 쓸 금액을 계획 카드에 적어 보세요." },
  { id: "spend-2", topic: "SPEND", emoji: "⚖️", title: "두 개를 나란히 놓고 보기",
    body: [
      "비슷한 물건이 두 개 있으면 값과 크기를 나란히 봐요.",
      "싼 걸 고르라는 게 아니에요. 무엇이 나한테 더 좋은지 내가 고르는 거예요.",
    ],
    tryIt: "장 볼 때 같은 물건 두 개의 가격표를 비교해 보세요." },
  { id: "spend-3", topic: "SPEND", emoji: "🔁", title: "쓰고 나서 맞춰 보기",
    body: [
      "적어 둔 것과 실제로 쓴 것을 견줘 봐요. 딱 맞히지 않아도 괜찮아요.",
      "다음번에 더 잘 맞히게 되는 게 진짜예요. 맞춰 보지 않으면 늘지 않아요.",
    ],
    tryIt: "오늘 쓴 돈을 계획 카드와 맞춰 보세요." },

  // 모으기
  { id: "save-1", topic: "SAVE", emoji: "🎯", title: "왜 모으는지 정하기",
    body: [
      "그냥 모으면 금방 꺼내 쓰게 돼요. 「무엇을 위해」가 있으면 달라져요.",
      "목표가 있으면 저금통이 참는 곳이 아니라 가까워지는 곳이 돼요.",
    ],
    tryIt: "갖고 싶은 것 하나를 정해서 적어 두세요." },
  { id: "save-2", topic: "SAVE", emoji: "🐢", title: "조금씩이 제일 세",
    body: [
      "한 번에 많이 넣는 것보다 조금씩 자주 넣는 게 오래가요.",
      "하루 100원이면 한 달에 3,000원이에요. 작아 보여도 쌓여요.",
    ],
    tryIt: "오늘 100원을 저금통에 넣어 보세요." },
  { id: "save-3", topic: "SAVE", emoji: "🚪", title: "꺼내 쓸 때를 정해 두기",
    body: [
      "언제 꺼낼지 미리 정해 두면 흔들릴 때 도움이 돼요.",
      "목표에 닿았을 때 꺼내는 게 가장 기분 좋아요.",
    ],
    tryIt: "목표까지 얼마나 남았는지 확인해 보세요." },
];

export const lessonsOf = (topic: Topic) => LESSONS.filter((l) => l.topic === topic);
export const findLesson = (id: string) => LESSONS.find((l) => l.id === id) ?? null;
/** 영역당 편수 — 잠긴 영역은 0편이다 */
export const lessonCount = (topic: Topic) => lessonsOf(topic).length;
