// 🔴 데이터는 DB(`@/modules/items`)가, 카탈로그는 `@/contracts/items` 가 준다.
// 여기 남은 것은 문구뿐이다.

/**
 * 오늘 할 일 — 🔴 **하단 탭에 있는 것은 넣지 않는다.** 같은 길을 두 번 두면
 * 아이는 둘이 다른 곳인 줄 안다. 미션·배우기·내 별·상점은 탭에 있다.
 */
export const todo = [
  { href: "/child/practice", emoji: "✋", label: "실천하기" },
  { href: "/child/wishlist", emoji: "🎁", label: "갖고 싶은 것" },
];

/** 아직 아무것도 없는 방 — 오늘 가입한 아이가 보는 화면 */
export const emptyRoom = {
  title: "방이 비어 있어요",
  body: "별을 모아서 하나씩 꾸며 봐요",
};

export const itemsLabel = (n: number) => `내 아이템 ${n}개`;
export const shopLink = "상점";
export const todoTitle = "오늘 할 일";
/** 🔴 출석 별 — 받았을 때만 말한다. 매번 띄우면 아이가 무시한다 (FR-010) */
export const attendanceNotice = "오늘도 왔네요! ⭐ 1개를 받았어요";
