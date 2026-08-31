import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import { TOPIC_LABEL, type Topic } from "@/contracts/learning";

/**
 * 퀴즈 채점과 ⭐ 지급 — LRN-001.
 *
 * 🔴 **퀴즈는 LEARNING 경로다.** WPA 분자에 넣지 않는다 —
 *    넣으면 접속만 해도 실천 지표가 오르는 활동량 지표로 퇴화한다 (SRS §6.2.2).
 *    그래서 `PracticeCredit` 을 만들지 않고 별만 기입한다.
 *
 * 🔴 **오답에 벌칙·감소가 없다.** 별을 빼앗지 않는다 (P-03). 해설만 보여준다.
 *
 * 🔴 **문항 수를 지어내지 않는다.** 예전엔 문항이 1개인데 화면에 「3 / 5문제」로
 *    나갔다. 아이가 두 문제를 어디서 놓쳤는지 찾게 만든다. 총 수는 여기서 센다.
 */

export type QuizChoice = { key: string; text: string; correct: boolean };
export type QuizQuestion = {
  question: string;
  choices: QuizChoice[];
  explain: string;
};

const BANK: Record<string, { topic: Topic; questions: QuizQuestion[] }> = {
  earn: {
    topic: "EARN",
    questions: [
      { question: "집안일을 도와 용돈을 받았어요. 이 돈은 무엇일까요?",
        choices: [
          { key: "a", text: "일해서 번 돈", correct: true },
          { key: "b", text: "그냥 생긴 돈", correct: false },
          { key: "c", text: "빌린 돈", correct: false },
        ],
        explain: "무언가를 해서 받은 돈이에요. 그래서 「벌기」라고 불러요." },
      { question: "가게에 있는 물건은 어떻게 거기 있게 됐을까요?",
        choices: [
          { key: "a", text: "누군가 만들고 옮겼어요", correct: true },
          { key: "b", text: "저절로 생겨요", correct: false },
          { key: "c", text: "가게 주인이 주웠어요", correct: false },
        ],
        explain: "물건 뒤에는 늘 일한 사람이 있어요. 돈도 그렇게 오가요." },
      { question: "30분 도와서 1,000원을 벌었어요. 이 돈에 들어 있는 건?",
        choices: [
          { key: "a", text: "내 30분", correct: true },
          { key: "b", text: "아무것도 없어요", correct: false },
          { key: "c", text: "운", correct: false },
        ],
        explain: "번 돈에는 시간이 들어 있어요. 쓸 때 그걸 떠올리면 고르기 쉬워요." },
    ],
  },
  spend: {
    topic: "SPEND",
    questions: [
      { question: "문구점에서 5,000원을 쓰기로 적어 뒀어요. 6,000원짜리를 발견하면?",
        choices: [
          { key: "a", text: "적어둔 걸 다시 보고 고른다", correct: true },
          { key: "b", text: "그냥 산다", correct: false },
          { key: "c", text: "아무것도 안 산다", correct: false },
        ],
        explain: "적어둔 것과 견줘 보는 게 「잘 쓰기」예요. 안 사는 게 정답은 아니에요." },
      { question: "비슷한 물건이 두 개 있어요. 어떻게 고를까요?",
        choices: [
          { key: "a", text: "값과 크기를 나란히 본다", correct: true },
          { key: "b", text: "무조건 싼 걸 고른다", correct: false },
          { key: "c", text: "무조건 비싼 걸 고른다", correct: false },
        ],
        explain: "싼 걸 고르라는 게 아니에요. 무엇이 나한테 더 좋은지 내가 고르는 거예요." },
      { question: "계획 카드에 적은 것보다 조금 더 썼어요. 어떻게 할까요?",
        choices: [
          { key: "a", text: "얼마나 달랐는지 맞춰 본다", correct: true },
          { key: "b", text: "못 본 척한다", correct: false },
          { key: "c", text: "다시는 안 적는다", correct: false },
        ],
        explain: "딱 맞히지 않아도 괜찮아요. 맞춰 봐야 다음에 더 잘 맞혀요." },
    ],
  },
  save: {
    topic: "SAVE",
    questions: [
      { question: "저금통에 넣은 돈은 언제 쓰는 게 좋을까요?",
        choices: [
          { key: "a", text: "정해둔 목표에 닿았을 때", correct: true },
          { key: "b", text: "생각날 때마다", correct: false },
          { key: "c", text: "가득 찼을 때", correct: false },
        ],
        explain: "왜 모으는지 정해두면 꺼내 쓸 때를 알 수 있어요." },
      { question: "하루에 100원씩 넣으면 한 달에 얼마가 될까요?",
        choices: [
          { key: "a", text: "3,000원쯤", correct: true },
          { key: "b", text: "300원쯤", correct: false },
          { key: "c", text: "30,000원쯤", correct: false },
        ],
        explain: "작아 보여도 쌓여요. 조금씩 자주가 오래가요." },
      { question: "모으기가 잘 되려면 가장 먼저 할 일은?",
        choices: [
          { key: "a", text: "무엇을 위해 모을지 정하기", correct: true },
          { key: "b", text: "큰 저금통 사기", correct: false },
          { key: "c", text: "돈을 더 받기", correct: false },
        ],
        explain: "목표가 있으면 저금통이 참는 곳이 아니라 가까워지는 곳이 돼요." },
    ],
  },
};

export const QUIZ_TOPICS = Object.keys(BANK);
export const quizTotal = (slug: string) => BANK[slug]?.questions.length ?? 0;
export const quizTopic = (slug: string) => BANK[slug]?.topic ?? "EARN";
export const quizTitle = (slug: string) => `${TOPIC_LABEL[quizTopic(slug)]} 퀴즈`;

/** n 은 1부터. 범위를 벗어나면 1번으로 돌린다 */
export function getQuiz(slug: string, n: number) {
  const bank = BANK[slug] ?? BANK.earn;
  const total = bank.questions.length;
  const index = Number.isFinite(n) && n >= 1 && n <= total ? Math.floor(n) : 1;
  return { ...bank.questions[index - 1], topic: bank.topic, index, total };
}

export type GradeResult = {
  correct: boolean;
  explain: string;
  /** 맞혔고 **처음**이면 별이 하나 는다. 두 번째부터는 늘지 않는다 */
  starred: boolean;
  balance: number;
};

/**
 * 채점 → 진도 갱신 → ⭐ 지급.
 * 🔴 멱등 키에 **문항 번호를 넣는다.** 같은 문항을 다시 맞혀도 별이 또 생기지 않는다 (REQ-NF-003).
 */
export async function gradeQuiz(childId: string, slug: string, n: number, choiceKey: string): Promise<GradeResult> {
  const q = getQuiz(slug, n);
  const correct = q.choices.some((c) => c.key === choiceKey && c.correct);

  if (!correct) {
    // 오답 — 아무것도 깎지 않는다. 해설만 준다
    return { correct: false, explain: q.explain, starred: false, balance: await currentBalance(childId) };
  }

  const res = await grantStar({
    childId,
    triggerCode: "QUIZ_CORRECT",
    delta: 1,
    idempotencyKey: `quiz:${childId}:${slug}:${q.index}`,
  });

  // 🔴 처음 맞힌 것만 센다. 다시 풀어도 「퀴즈 N개」가 부풀지 않는다
  if (res.ok && !res.duplicated) {
    await prisma.learningProgress.upsert({
      where: { childId_topic: { childId, topic: q.topic } },
      create: { childId, topic: q.topic, quizCorrect: 1 },
      update: { quizCorrect: { increment: 1 } },
    });
  }

  return {
    correct: true,
    explain: q.explain,
    starred: res.ok && !res.duplicated,
    balance: res.ok ? res.balance : await currentBalance(childId),
  };
}

async function currentBalance(childId: string) {
  const agg = await prisma.starLedgerEntry.aggregate({ where: { childId }, _sum: { delta: true } });
  return agg._sum.delta ?? 0;
}
