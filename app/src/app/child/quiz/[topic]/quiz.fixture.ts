// PROTO-DATA: LRN-001 — 백엔드 완료 시 이 파일을 지우고 퀴즈 문항·해설 조회로 대체한다
export type Choice = { readonly key: string; readonly text: string; readonly correct: boolean };
export type Quiz = {
  readonly topicLabel: string; readonly index: number; readonly total: number;
  readonly question: string; readonly choices: readonly Choice[];
  /** 오답에도 벌칙·감소 연출을 두지 않는다 (LRN-002와 같은 규범) */
  readonly explain: string;
};

const BY_TOPIC: Record<string, Quiz> = {
  earn: {
    topicLabel: "벌기", index: 3, total: 5,
    question: "집안일을 도와 용돈을 받았어요. 이 돈은 무엇일까요?",
    choices: [
      { key: "a", text: "일해서 번 돈", correct: true },
      { key: "b", text: "그냥 생긴 돈", correct: false },
      { key: "c", text: "빌린 돈",     correct: false },
    ],
    explain: "무언가를 해서 받은 돈이에요. 그래서 「벌기」라고 불러요.",
  },
  spend: {
    topicLabel: "잘 쓰기", index: 2, total: 5,
    question: "문구점에서 5,000원을 쓰기로 적어 뒀어요. 6,000원짜리를 발견하면?",
    choices: [
      { key: "a", text: "적어둔 걸 다시 보고 고른다", correct: true },
      { key: "b", text: "그냥 산다",                  correct: false },
      { key: "c", text: "아무것도 안 산다",           correct: false },
    ],
    explain: "적어둔 것과 견줘 보는 게 「잘 쓰기」예요. 안 사는 게 정답은 아니에요.",
  },
  save: {
    topicLabel: "모으기", index: 1, total: 5,
    question: "저금통에 넣은 돈은 언제 쓰는 게 좋을까요?",
    choices: [
      { key: "a", text: "정해둔 목표에 닿았을 때", correct: true },
      { key: "b", text: "생각날 때마다",           correct: false },
      { key: "c", text: "가득 찼을 때",            correct: false },
    ],
    explain: "왜 모으는지 정해두면 꺼내 쓸 때를 알 수 있어요.",
  },
};

export function getQuiz(topic: string): Quiz {
  return BY_TOPIC[topic] ?? BY_TOPIC.earn;
}
export const TOPICS = Object.keys(BY_TOPIC);
