// 🔴 데이터는 DB(`@/modules/items`)가, 카탈로그는 `@/contracts/items` 가 준다.
// 여기 남은 것은 문구뿐이다.

/** 오늘 할 일 — 아이는 여기서 출발한다 */
export const todo = [
  { href: "/child/missions", emoji: "🎯", label: "미션" },
  { href: "/child/learn",    emoji: "📚", label: "오늘의 학습" },
  { href: "/child/plan/new", emoji: "📝", label: "계획 카드 적기" },
  { href: "/child/wishlist", emoji: "🎯", label: "갖고 싶은 것" },
];

/** 아직 아무것도 없는 방 — 오늘 가입한 아이가 보는 화면 */
export const emptyRoom = {
  title: "방이 비어 있어요",
  body: "별을 모아서 하나씩 꾸며 봐요",
};

export const itemsLabel = (n: number) => `내 아이템 ${n}개`;
export const shopLink = "별로 바꾸기 →";
export const todoTitle = "오늘 할 일";
