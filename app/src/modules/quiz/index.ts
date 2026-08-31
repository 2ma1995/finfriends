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
      { question: "가게에 있는 물건은 어떻게 거기에 있게 됐을까요?",
        choices: [
          { key: "a", text: "누군가 만들고 옮겨 놓았어요", correct: true },
          { key: "b", text: "저절로 생겨요", correct: false },
          { key: "c", text: "가게 주인이 주웠어요", correct: false },
        ],
        explain: "물건 뒤에는 늘 일한 사람이 있어요. 그 사람들이 그 일을 하고 돈을 받아요." },
      { question: "돈을 버는 방법에 대해 맞는 말은?",
        choices: [
          { key: "a", text: "직업 말고도 여러 가지가 있어요", correct: true },
          { key: "b", text: "직업을 갖는 것 하나뿐이에요", correct: false },
          { key: "c", text: "가게를 하는 것 하나뿐이에요", correct: false },
        ],
        explain: "회사에서 받는 돈, 가게를 해서 버는 돈, 모아 둔 돈이 늘어 생기는 돈, 나라가 도와주는 돈이 모두 있어요." },
      { question: "다음 중 「내가 번 돈」은 무엇일까요?",
        choices: [
          { key: "a", text: "심부름을 하고 받은 2,000원", correct: true },
          { key: "b", text: "이번 주에 받은 용돈", correct: false },
          { key: "c", text: "설날에 받은 세뱃돈", correct: false },
        ],
        explain: "용돈과 세뱃돈은 어른들이 주시는 돈이에요. 무언가를 해서 받은 돈이 내가 번 돈이에요." },
      { question: "직업을 고를 때 무엇을 볼까요?",
        choices: [
          { key: "a", text: "얼마 버는지 · 나한테 맞는지 · 재미있는지", correct: true },
          { key: "b", text: "돈을 얼마 버는지만 보면 돼요", correct: false },
          { key: "c", text: "친구가 하는 걸 따라 고르면 돼요", correct: false },
        ],
        explain: "돈만 보고 골랐다가 나한테 안 맞으면 하기가 너무 힘들어요. 잘 맞는 일이면 힘들어도 보람이 있어요." },
    ],
  },
  spend: {
    topic: "SPEND",
    questions: [
      { question: "갖고 싶은 게 많은데 다 못 사요. 왜 그럴까요?",
        choices: [
          { key: "a", text: "쓸 수 있는 돈이 정해져 있어서", correct: true },
          { key: "b", text: "돈이 너무 많아서", correct: false },
          { key: "c", text: "물건이 너무 적어서", correct: false },
        ],
        explain: "돈이 많아서 고민이 생기는 게 아니에요. 모자라기 때문에 무엇을 살지 고르는 거예요." },
      { question: "필통을 사려는데 하나는 싸고 하나는 조금 비싸요. 어떻게 할까요?",
        choices: [
          { key: "a", text: "값과 튼튼한 정도를 같이 본다", correct: true },
          { key: "b", text: "무조건 싼 걸 산다", correct: false },
          { key: "c", text: "보자마자 마음에 드는 걸 산다", correct: false },
        ],
        explain: "싼 걸 골랐다가 금방 망가지면 다시 사야 해요. 값만 보지 말고 오래 쓸 수 있는지도 봐요." },
      { question: "용돈을 받았어요. 모으려면 어떤 순서가 좋을까요?",
        choices: [
          { key: "a", text: "모을 돈을 먼저 떼고, 남은 걸로 쓴다", correct: true },
          { key: "b", text: "먼저 쓰고, 남으면 모은다", correct: false },
          { key: "c", text: "다 쓰고 다음 달에 모은다", correct: false },
        ],
        explain: "쓰고 남은 걸 모으려고 하면 거의 남지 않아요. 순서만 바꿔도 한 달 뒤가 달라져요." },
      { question: "어른이 신용카드로 물건을 샀어요. 그 물건값은 어떻게 될까요?",
        choices: [
          { key: "a", text: "카드 회사가 먼저 내주고 어른이 나중에 갚아요", correct: true },
          { key: "b", text: "카드가 있으면 안 내도 돼요", correct: false },
          { key: "c", text: "카드 회사가 대신 내주고 끝이에요", correct: false },
        ],
        explain: "카드는 「공짜로 사는 것」이 아니라 「나중에 내가 내는 것」이에요. 늦게 갚으면 더 많이 내야 해요." },
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
      { question: "하루에 100원씩 넣으면 한 달에 얼마쯤 될까요?",
        choices: [
          { key: "a", text: "3,000원쯤", correct: true },
          { key: "b", text: "300원쯤", correct: false },
          { key: "c", text: "30,000원쯤", correct: false },
        ],
        explain: "작아 보여도 쌓여요. 적은 돈이라 모을 필요 없다는 말은 맞지 않아요." },
      { question: "은행 통장을 만들려고 해요. 맞는 말은?",
        choices: [
          { key: "a", text: "어린이는 어른과 함께 가야 만들 수 있어요", correct: true },
          { key: "b", text: "어린이 혼자 가서 만들 수 있어요", correct: false },
          { key: "c", text: "돈이 적으면 만들 수 없어요", correct: false },
        ],
        explain: "어린이는 보호자와 함께 가야 해요. 돈이 적어도 만들 수 있어요." },
      { question: "「공짜로 줄게요」라며 이름과 전화번호를 묻는 문자가 왔어요. 어떻게 할까요?",
        choices: [
          { key: "a", text: "누르지 말고 어른에게 보여 준다", correct: true },
          { key: "b", text: "공짜니까 얼른 적어서 보낸다", correct: false },
          { key: "c", text: "친구에게 물어보고 같이 누른다", correct: false },
        ],
        explain: "내 정보를 노리는 가짜 문자예요. 이름·전화번호·계좌번호는 아무한테나 알려 주지 않아요." },
    ],
  },
  grow: {
    topic: "GROW",
    questions: [
      { question: "은행은 왜 나에게 이자를 줄까요?",
        choices: [
          { key: "a", text: "내 돈을 빌려주고 받은 값을 나눠 주니까", correct: true },
          { key: "b", text: "그냥 선물로 주는 거예요", correct: false },
          { key: "c", text: "돈을 맡기면 저절로 늘어나서", correct: false },
        ],
        explain: "은행은 맡아 둔 돈을 필요한 사람에게 빌려줘요. 빌려 간 사람이 조금 더 얹어 갚고, 은행이 그중 일부를 나눠 줘요." },
      { question: "5년 전에 2,000원이던 과자가 지금 3,000원이에요. 무슨 뜻일까요?",
        choices: [
          { key: "a", text: "같은 돈으로 살 수 있는 게 줄었어요", correct: true },
          { key: "b", text: "과자가 더 커졌어요", correct: false },
          { key: "c", text: "내 돈의 힘이 세졌어요", correct: false },
        ],
        explain: "값이 오르면 돈은 그대로인데 살 수 있는 양이 줄어요. 그래서 그냥 두기만 하면 손해를 볼 수 있어요." },
      { question: "돈을 크게 불릴 수 있다는 방법에 대해 맞는 말은?",
        choices: [
          { key: "a", text: "많이 늘 수도 있지만 줄어들 수도 있어요", correct: true },
          { key: "b", text: "언제나 저축보다 많이 벌어요", correct: false },
          { key: "c", text: "내가 좋아하는 회사면 안전해요", correct: false },
        ],
        explain: "늘기만 하는 방법은 없어요. 그래서 어른들은 없어도 되는 돈으로만, 한곳에 몰지 않고 나눠서 해요." },
      { question: "돈을 빌리면 이자는 어떻게 될까요?",
        choices: [
          { key: "a", text: "내가 이자를 내야 해요", correct: true },
          { key: "b", text: "빌려도 이자는 없어요", correct: false },
          { key: "c", text: "빌리면 이자를 받아요", correct: false },
        ],
        explain: "맡기면 이자를 받고, 빌리면 이자를 내요. 같은 이자인데 방향이 반대예요." },
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
