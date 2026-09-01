// 보호자가 첫 계획 카드를 대신 적는 화면 — 온보딩 5단계 · 어긋남 대장 D43.
// 🔴 업종 목록은 `@/contracts/plan` 이, 저장은 `actions/parent-plan` 이 한다. 여기는 문구뿐이다.

export const title = "첫 계획 카드";

/**
 * 🔴 **「부모가 예산을 정해 준다」로 읽히면 안 된다.** 계획 카드는 아이가 적는 것이고
 *    이 화면은 **한 장을 같이 적어 보는 자리**다. 그 차이를 문구가 말한다.
 */
export const notice =
  "아이와 함께 한 장만 적어 보세요. 다음부터는 아이가 자기 화면에서 적습니다.";
export const authorNotice = "이 카드는 「부모님이 적음」으로 남아요.";

/** 🔴 `{name}` 은 아이 이름이 들어간다 */
export const subTpl = "{name} 이(가) 다음에 쓸 계획";

export const labels = { where: "어디서", what: "무엇을", amount: "얼마를" };
export const placeholders = { where: "예: 학교 앞 문구점", amount: "3000" };
export const submitLabel = "적어두기";

export const errorNotice = "어디서 · 무엇을 · 얼마를 다 적어야 해요.";
/** 🔴 「안 돼요」로 끝내지 않는다. 다음에 뭘 할지 알아야 한다 (ACE-1.1) */
export const tooBigNotice = "금액이 너무 커요. 백만 원까지 적을 수 있어요.";

export const noChild = {
  title: "등록한 아이가 없어요",
  body: "계획 카드는 아이 이름으로 남습니다. 아이 프로필을 먼저 만들어 주세요.",
  hint: "온보딩 3단계",
  action: "아이 프로필 만들기",
};
