import { readOnboardingProgress } from "@/modules/consent";

/**
 * 로그인한 보호자가 갈 곳 — 어긋남 대장 D43.
 *
 * 🔴 **다 끝낸 사람에게 할 일 목록을 보여주지 않는다.** 예전엔 언제나
 *    `/parent/onboarding` 이었다. 여섯 단계가 모두 ✓ 인 사람이 로그인할 때마다
 *    **✓ 여섯 개짜리 화면**을 지나야 했다 — 매일 쓰는 사람에게는 그게 앱의 첫인상이다.
 *
 * 🔴 **판단을 한 곳에 둔다.** 로그인 액션과 로그인 화면 두 군데가 각자 정하면
 *    한쪽만 고쳐져 갈라진다. 두 곳 다 이 함수를 부른다.
 */
export async function guardianLanding(guardianId: string) {
  const p = await readOnboardingProgress(guardianId);
  // 🔴 키를 나열하지 않는다 — 단계가 늘면 여기도 같이 늘어야 하는데, 반드시 잊는다
  const allDone = Object.values(p).every(Boolean);
  return allDone ? "/parent/tree" : "/parent/onboarding";
}
