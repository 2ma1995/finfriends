// 🔴 데이터는 DB(`@/modules/items`)가, 카탈로그는 `@/contracts/items` 가 준다.
// 여기 남은 것은 문구뿐이다.

/**
 * 오늘 할 일 — 🔴 **하단 탭에 있는 것은 넣지 않는다.** 같은 길을 두 번 두면
 * 아이는 둘이 다른 곳인 줄 안다. 미션·배우기·내 별·상점은 탭에 있다.
 */
/**
 * 오늘 할 일 문구 — 🔴 **목록은 여기 없다.** 무엇이 남았는지는 DB 가 정한다.
 *
 * 예전엔 네 줄이 **늘 똑같이** 박혀 있었다. 할 게 있든 없든 같은 화면이라
 * **아이가 넷을 다 눌러 봐야** 오늘 뭐가 남았는지 알 수 있었다 —
 * 그건 할 일 목록이 아니라 메뉴다.
 */
export const today = {
  plan:     { href: "/child/plan/new",  emoji: "📝", label: "오늘 쓸 계획 적기" },
  practice: { href: "/child/practice",  emoji: "✋", label: "배운 것 해보기" },
  lesson:   { href: "/child/learn",     emoji: "📖", label: "오늘 읽을 이야기" },
  quiz:     { href: "/child/practice",  emoji: "❓", label: "오늘의 문제" },
  wish:     { href: "/child/wishlist",  emoji: "🎁", label: "갖고 싶은 것 모으기" },
};

/** 🔴 다 했으면 그렇다고 말한다 — 빈 목록은 고장으로 읽힌다 */
export const todayAllDone = "오늘 할 일을 다 했어요! 내일 또 만나요";
/** 🔴 `{n}` 은 화면에 안 그린 미션 수 */
export const missionMore = "미션 {n}개 더 보기 →";
/** 🔴 `{n}` 은 남은 영역 수 — 「세 군데 남았어요」 */
export const restCount = (n: number) => `${n}군데`;

/** 아직 아무것도 없는 방 — 오늘 가입한 아이가 보는 화면 */
export const emptyRoom = {
  title: "방이 비어 있어요",
  body: "별을 모아서 하나씩 꾸며 봐요",
};

/**
 * 🔴 자리표시자를 쓴다 — 문구는 여기가, 숫자는 화면이 갖는다.
 *    함수는 클라이언트 컴포넌트로 못 넘어간다(직렬화가 안 된다).
 */
export const itemsTitle = "내 아이템 (방에 {n}개)";
export const myItemsHint = "칸을 누르면 가진 것을 볼 수 있어요";
/** 🔴 빈 칸도 말한다. 아무것도 안 나오면 아이는 「고장났나」로 읽는다 */
export const emptyCategory = "여긴 아직 없어요.";
export const shopLink = "상점";
export const todoTitle = "오늘 할 일";
/** 🔴 출석 별 — 받았을 때만 말한다. 매번 띄우면 아이가 무시한다 (FR-010) */
export const attendanceNotice = "오늘도 왔네요! ⭐ 1개를 받았어요";

/**
 * 방 제목 — 🔴 **「내 방」이 아니라 「서연의 방」이다.**
 *
 * 같은 화면이라도 자기 이름이 붙으면 **자기 자리**가 된다.
 * 이름을 못 읽으면 「내 방」으로 떨어진다 — 이름은 꾸밈이지 관문이 아니다.
 */
export const roomTitle = (name: string | null) => (name ? `${name}의 방` : "내 방");
