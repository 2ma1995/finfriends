import "server-only";
import { prisma } from "@/db";
import { grantStar } from "@/modules/star-ledger";
import type { Topic } from "@/contracts/learning";

/**
 * 퀴즈 채점과 ⭐ 지급 — LRN-001 슬라이스.
 *
 * 🔴 **퀴즈는 LEARNING 경로다.** WPA 분자에 넣지 않는다 —
 *    넣으면 접속만 해도 실천 지표가 오르는 활동량 지표로 퇴화한다 (SRS §6.2.2).
 *    그래서 `PracticeCredit` 을 만들지 않고 별만 기입한다.
 *
 * 🔴 **오답에 벌칙·감소가 없다.** 별을 빼앗지 않는다 (P-03).
 *    틀리면 해설을 보여줄 뿐이다.
 *
 * 🔴 문항은 아직 DB 에 없다 — `DAT-003` 이 채운다. 그때까지 상수다.
 */

export type QuizChoice = { key: string; text: string; correct: boolean };
export type QuizQuestion = {
  topic: Topic; index: number; total: number;
  question: string; choices: QuizChoice[]; explain: string;
};

const BANK: Record<string, QuizQuestion> = {
  earn: {
    topic: "EARN", index: 3, total: 5,
    question: "집안일을 도와 용돈을 받았어요. 이 돈은 무엇일까요?",
    choices: [
      { key: "a", text: "일해서 번 돈", correct: true },
      { key: "b", text: "그냥 생긴 돈", correct: false },
      { key: "c", text: "빌린 돈", correct: false },
    ],
    explain: "무언가를 해서 받은 돈이에요. 그래서 「벌기」라고 불러요.",
  },
  spend: {
    topic: "SPEND", index: 2, total: 5,
    question: "문구점에서 5,000원을 쓰기로 적어 뒀어요. 6,000원짜리를 발견하면?",
    choices: [
      { key: "a", text: "적어둔 걸 다시 보고 고른다", correct: true },
      { key: "b", text: "그냥 산다", correct: false },
      { key: "c", text: "아무것도 안 산다", correct: false },
    ],
    explain: "적어둔 것과 견줘 보는 게 「잘 쓰기」예요. 안 사는 게 정답은 아니에요.",
  },
  save: {
    topic: "SAVE", index: 1, total: 5,
    question: "저금통에 넣은 돈은 언제 쓰는 게 좋을까요?",
    choices: [
      { key: "a", text: "정해둔 목표에 닿았을 때", correct: true },
      { key: "b", text: "생각날 때마다", correct: false },
      { key: "c", text: "가득 찼을 때", correct: false },
    ],
    explain: "왜 모으는지 정해두면 꺼내 쓸 때를 알 수 있어요.",
  },
};

export const QUIZ_TOPICS = Object.keys(BANK);
export function getQuiz(slug: string): QuizQuestion {
  return BANK[slug] ?? BANK.earn;
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
 *
 * 🔴 멱등 키에 **문항을 넣는다.** 같은 문항을 다시 맞혀도 별이 또 생기지 않는다.
 *    오프라인 큐가 재전송해도 마찬가지다 (REQ-NF-003).
 */
export async function gradeQuiz(childId: string, slug: string, choiceKey: string): Promise<GradeResult> {
  const q = getQuiz(slug);
  const correct = q.choices.some((c) => c.key === choiceKey && c.correct);

  if (!correct) {
    // 오답 — 아무것도 깎지 않는다. 해설만 준다
    const balance = await currentBalance(childId);
    return { correct: false, explain: q.explain, starred: false, balance };
  }

  await prisma.learningProgress.upsert({
    where: { childId_topic: { childId, topic: q.topic } },
    create: { childId, topic: q.topic, completedCount: 0, quizCorrect: 1 },
    update: { quizCorrect: { increment: 1 } },
  });

  const res = await grantStar({
    childId,
    triggerCode: "QUIZ_CORRECT",
    delta: 1,
    idempotencyKey: `quiz:${childId}:${slug}:${q.index}`,
  });

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
