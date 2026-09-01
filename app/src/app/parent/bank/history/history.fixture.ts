/**
 * 용돈 기록 화면 문구 — D18.
 *
 * 🔴 **읽기만 하는 화면이다.** 고치는 것은 `/parent/bank/adjust` 가 맡는다 —
 *    한 화면에서 보고 고치게 두면 목록을 훑다가 실수로 되돌린다.
 */

export const title = "용돈 기록";
export const sub = "들어오고 나간 것 전부";

/** 🔴 아이가 한 것과 부모가 한 것을 구별해 보여준다. 섞이면 누가 무엇을 했는지 모른다 */
export const byGuardianBadge = "부모님이 적음";
/**
 * 🔴 **목표와 적금을 가른다.** `MOVED_CODES` 가 넷으로 늘면서(적금이 더해짐)
 *    적금 기록까지 「목표로 옮김」으로 나오고 있었다 — 부모가 위시리스트로 읽는다.
 *    둘 다 「쓴 게 아니라 묶인 것」이지만 **묶인 곳이 다르다.**
 */
export const movedBadge = "목표로 옮김";
export const lockedBadge = "적금에 넣음";
export const reversedBadge = "되돌림";

export const empty = {
  emoji: "🧾",
  title: "아직 기록이 없어요",
  body: "용돈을 넣으면 여기에 한 줄씩 쌓입니다.",
  hint: "아이 화면에도 같은 기록이 보입니다",
};

/** 🔴 앱이 돈을 보관한다는 오해를 만들면 안 된다 (D18) */
export const notice = "여기는 「얼마 줬는지」를 적는 장부입니다. 실제 돈은 현금이나 부모님 카드로 오갑니다.";
export const adjustLink = "보낸 돈 수정하기";
