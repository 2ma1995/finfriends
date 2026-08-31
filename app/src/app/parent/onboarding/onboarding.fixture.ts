// PROTO-DATA: CON-003 — 백엔드 완료 시 이 파일을 지우고 온보딩 세션 저장 액션으로 대체한다
export type Step = {
  readonly n: number;
  readonly title: string;
  readonly body: string;
  readonly state: "done" | "current" | "todo";
  /** 화면이 있는 단계만 갖는다. 없으면 아직 만들지 않은 것이다 */
  readonly href?: string;
};

/**
 * 6단계. 세션이 끊겨도 입력값을 잃지 않는다 (CON-003)
 *
 * 4단계 「자녀 초대」는 SRS 다이어그램 A의 P4다. 5단계 구성일 때 3단계에 묻혀 있었는데,
 * 초대는 아이 기기를 프로필에 묶는 별도 행위라 단계를 나눴다 (원장 T17).
 */
export const steps: readonly Step[] = [
  { n: 1, title: "보호자 계정",    body: "이메일과 비밀번호를 등록했습니다",          state: "done",    href: "/signup" },
  { n: 2, title: "법정대리인 동의", body: "만 14세 미만 아동의 동의 절차를 마쳤습니다", state: "done",    href: "/consent" },
  { n: 3, title: "아이 프로필",     body: "이름과 태어난 해를 적었습니다",             state: "done" },
  { n: 4, title: "자녀 초대",       body: "아이 기기에서 열 링크를 만듭니다",           state: "current", href: "/parent/invite" },
  { n: 5, title: "첫 계획 카드",    body: "어디서 · 얼마를 쓸지 한 장만 적어 봅니다",    state: "todo" },
  { n: 6, title: "카드 연결",       body: "나중에 해도 됩니다 — 카드 없이도 시작합니다", state: "todo" },
];

/** 진입 저항을 결정 전에 처리한다 — 현금은 5초인데 온보딩은 여섯 단계다 */
export const reassurance = "지금 다 하지 않아도 됩니다. 4단계까지만 하면 아이가 오늘 시작할 수 있어요.";
