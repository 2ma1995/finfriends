import type { OnboardingProgress } from "@/contracts/child";

/**
 * 온보딩 단계 문구 — CON-003.
 *
 * 🔴 **상태는 여기 없다.** DB 에서 센 `OnboardingProgress` 로 계산한다.
 *    상태를 문구와 함께 두면 화면은 「3단계 완료」라고 하는데 DB 에는 아이가 없는
 *    상태가 만들어진다 — 실제로 그렇게 되어 있었다.
 *
 * 🔴 **화면이 없는 단계는 `href` 를 갖지 않는다.** 그 구분이 있어야
 *    「눌러도 아무 일도 안 나는 버튼」을 그리지 않을 수 있다 — 실제로 그렇게 되어 있었다.
 *
 * `essential` 은 「아이가 시작할 수 있는가」의 기준이다. 4단계까지가 그 선이고,
 * 5·6단계는 그 뒤에 해도 되는 일이다.
 */
export type Step = {
  readonly n: number;
  readonly title: string;
  readonly body: string;
  readonly state: "done" | "current" | "todo";
  /** 화면이 있는 단계만 갖는다. 없으면 아직 만들지 않은 것이다 */
  readonly href?: string;
  /** 아이가 시작하려면 반드시 끝나야 하는 단계 */
  readonly essential: boolean;
};

const SPEC: readonly Omit<Step, "state">[] = [
  { n: 1, title: "보호자 계정", body: "이메일과 비밀번호를 등록했습니다", href: "/signup", essential: true },
  { n: 2, title: "법정대리인 동의", body: "만 14세 미만 아동의 동의 절차입니다", href: "/consent", essential: true },
  { n: 3, title: "아이 프로필", body: "이름과 태어난 해를 적습니다", href: "/parent/child/new", essential: true },
  { n: 4, title: "자녀 초대", body: "아이가 쓸 기기를 등록합니다", href: "/parent/invite", essential: true },
  { n: 5, title: "첫 계획 카드", body: "아이가 「어디서 · 얼마를 쓸지」 한 장 적으면 끝납니다", essential: false },
  /**
   * 🔴 **실물 카드 발급은 이번 범위 밖이다** — 새 SRS 가 `Out` 으로 뒀다.
   *    화면에 남긴 이유는 시연에서 흐름을 보여주기 위해서다 (`D20`).
   *    **그 사실을 문구가 말한다** — 안 적으면 곧 나올 기능으로 읽힌다.
   */
  { n: 6, title: "카드 연결", body: "이번 범위 밖입니다 — 카드 없이도 모든 기능이 됩니다", href: "/parent/card", essential: false },
];

export function buildSteps(p: OnboardingProgress): readonly Step[] {
  // 앞 단계가 끝나야 다음이 current 가 된다 — 순서가 규제 요건인 구간이 있다(동의 → 아이)
  // 🔴 5단계를 false 로 못박아 뒀었다 — 그러면 영원히 미완이라 화면이 거짓을 말한다
  const doneFlags = [p.accountDone, p.consentDone, p.childDone, p.deviceDone, p.planDone, p.cardDone];
  const firstTodo = doneFlags.indexOf(false);

  return SPEC.map((s, i) => ({
    ...s,
    state: doneFlags[i] ? "done" : i === firstTodo ? "current" : "todo",
  }));
}

/** 필수 단계가 다 끝났는가 — 끝났으면 아이는 오늘 시작할 수 있다 */
export function readyForChild(steps: readonly Step[]) {
  return steps.every((s) => !s.essential || s.state === "done");
}

/** 진입 저항을 결정 전에 처리한다 — 현금은 5초인데 온보딩은 여섯 단계다 */
export const reassurance = "지금 다 하지 않아도 됩니다. 4단계까지만 하면 아이가 오늘 시작할 수 있어요.";

/** 필수 단계를 다 끝낸 뒤의 안내 — 남은 두 단계는 화면이 아직 없다 */
export const readyNotice = "아이가 시작할 준비가 끝났어요. 5·6단계는 화면을 준비하고 있습니다.";
