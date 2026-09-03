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
  /**
   * 🔴 **평소에 적는 사람은 아이다.** 이 화면은 「한 장을 같이 적어 보는」 자리다 —
   *    아이가 계획 카드가 뭔지 모르는 채로 시작하지 않게 한다. `author` 에 보호자로 남는다.
   */
  { n: 5, title: "첫 계획 카드", body: "「어디서 · 얼마를 쓸지」 한 장만 같이 적어 봅니다", href: "/parent/plan/new", essential: false },
  /**
   * 🔴 **실물 카드 발급은 이번 범위 밖이다** — 새 SRS 가 `Out` 으로 뒀다.
   *    화면에 남긴 이유는 시연에서 흐름을 보여주기 위해서다 (`D20`).
   *    **그 사실을 문구가 말한다** — 안 적으면 곧 나올 기능으로 읽힌다.
   */
  /**
   * 🔴 **신청을 접수하면 넘어간다.** 예전엔 목업 4단계를 다 눌러 `ACTIVE` 가 돼야 ✓ 였다 —
   *    실물 발급은 범위 밖인데 온보딩이 그 목업의 끝을 기다리고 있었다.
   *    부모가 한 일은 「신청」이고 그다음은 제휴사 몫이다 (`readOnboardingProgress`).
   */
  { n: 6, title: "카드 연결", body: "신청만 하면 됩니다 — 발급은 범위 밖이고, 카드 없이도 모든 기능이 됩니다", href: "/parent/card", essential: false },
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
/**
 * 🔴 **이 여섯 단계에 미션은 없다** (2026-09-03 사용자 지적 — 「5단계 미션을 만들고」).
 *
 *    5단계는 «계획 카드»(어디서 · 얼마를 쓸지)인데 미션으로 읽혔다.
 *    둘 다 「부모가 아이에게 무언가를 정해 주는 일」이라 헷갈릴 만하다.
 *
 *    적어 두지 않으면 부모는 **튜토리얼을 다 끝내고도 미션이 없는 것**을 보고
 *    「안 만들어졌나」로 읽는다. 실제로 그렇게 물어보셨다.
 *
 * 🔴 **어디서 만드는지까지 적는다.** 「여기 없다」만 적으면 어디로 가야 할지 모른다.
 */
export const missionNotice =
  "미션은 이 여섯 단계에 없어요. 성장 나무 화면의 「미션 만들기」에서 언제든 만들 수 있습니다.";

export const reassurance = "지금 다 하지 않아도 됩니다. 4단계까지만 하면 아이가 오늘 시작할 수 있어요.";

/** 필수 단계를 다 끝낸 뒤의 안내 — 5·6단계도 이제 화면이 있다 (D43) */
export const readyNotice = "아이가 시작할 준비가 끝났어요. 5·6단계는 언제 하셔도 됩니다.";

/** 첫 계획 카드를 적고 돌아왔을 때 — 🔴 받았을 때만 말한다 */
export const plannedNotice = "첫 계획 카드를 적었어요. 다음부터는 아이가 자기 화면에서 적습니다.";

/** 여섯 단계를 다 끝냈다 — 다음부터 로그인하면 성장 나무로 바로 간다 (D43) */
export const allDoneNotice = "모두 끝났어요. 다음부터는 로그인하면 성장 나무가 바로 열립니다.";
