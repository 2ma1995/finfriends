import type { OnboardingProgress } from "@/contracts/child";

/**
 * 온보딩 단계 문구 — CON-003.
 *
 * 🔴 **상태는 여기 없다.** DB 에서 센 `OnboardingProgress` 로 계산한다.
 *    상태를 문구와 함께 두면 화면은 「3단계 완료」라고 하는데 DB 에는 아이가 없는
 *    상태가 만들어진다 — 실제로 그렇게 되어 있었다.
 *
 * 4단계 「자녀 초대」는 SRS 다이어그램 A 의 P4 다 (원장 T17).
 * 5·6단계는 아직 화면이 없어 `href` 가 없다.
 */
export type Step = {
  readonly n: number;
  readonly title: string;
  readonly body: string;
  readonly state: "done" | "current" | "todo";
  /** 화면이 있는 단계만 갖는다. 없으면 아직 만들지 않은 것이다 */
  readonly href?: string;
};

export function buildSteps(p: OnboardingProgress): readonly Step[] {
  // 앞 단계가 끝나야 다음이 current 가 된다 — 순서가 규제 요건인 구간이 있다(동의 → 아이)
  const doneFlags = [p.accountDone, p.consentDone, p.childDone, p.deviceDone, false, false];
  const firstTodo = doneFlags.indexOf(false);

  const spec: readonly Omit<Step, "state">[] = [
    { n: 1, title: "보호자 계정", body: "이메일과 비밀번호를 등록했습니다", href: "/signup" },
    { n: 2, title: "법정대리인 동의", body: "만 14세 미만 아동의 동의 절차입니다", href: "/consent" },
    { n: 3, title: "아이 프로필", body: "이름과 태어난 해를 적습니다", href: "/parent/child/new" },
    { n: 4, title: "자녀 초대", body: "아이가 쓸 기기를 등록합니다", href: "/parent/invite" },
    { n: 5, title: "첫 계획 카드", body: "어디서 · 얼마를 쓸지 한 장만 적어 봅니다" },
    { n: 6, title: "카드 연결", body: "나중에 해도 됩니다 — 카드 없이도 시작합니다" },
  ];

  return spec.map((s, i) => ({
    ...s,
    state: doneFlags[i] ? "done" : i === firstTodo ? "current" : "todo",
  }));
}

/** 진입 저항을 결정 전에 처리한다 — 현금은 5초인데 온보딩은 여섯 단계다 */
export const reassurance = "지금 다 하지 않아도 됩니다. 4단계까지만 하면 아이가 오늘 시작할 수 있어요.";
