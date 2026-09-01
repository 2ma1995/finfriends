// 🔴 데이터는 DB(`@/modules/allowance`)가 준다. 여기 남은 것은 문구뿐이다.
//
// 두 자료(금감원 익힘책 · 슬기로운 생활금융)가 **가장 강조하는 실천이 용돈기입장 쓰기**다.
// 날짜 · 내용 · 들어온 돈 · 나간 돈 · 남은 돈 다섯 칸을 그대로 옮겼다.

export const title = "내 통장";
export const balanceTitle = "쓸 수 있는 돈";
export const savedTitle = "목표에 넣어 둔 돈";

/** 🔴 카드 발급 단계 — 아이가 「언제 오는지」를 알아야 한다 (SRS UX-006 배송 대기) */
export const card = {
  NONE:      { emoji: "🪪", label: "카드가 아직 없어요",   body: "부모님이 만들어 주시면 여기에 보여요" },
  REQUESTED: { emoji: "📝", label: "카드를 신청했어요",     body: "확인이 끝나면 만들어져요" },
  VERIFIED:  { emoji: "✅", label: "확인이 끝났어요",       body: "곧 만들어서 보내 줘요" },
  SHIPPING:  { emoji: "🚚", label: "카드가 오고 있어요",    body: "도착하면 쓸 수 있어요" },
  ACTIVE:    { emoji: "💳", label: "카드를 쓸 수 있어요",   body: "쓴 내역이 계획 카드에 보여요" },
} as const;

/**
 * 🔴 **아직 받은 이자가 아니다.** 「한 번 줄 때 얼마인지」만 보여준다 —
 *    지급 주기가 미정인데 자동으로 주는 것처럼 보이면 아이가 기다리는 시점과 어긋난다.
 */
export const interest = {
  title: "이자",
  none: "아직 이자를 정하지 않았어요.",
  rate: (pct: number) => `목표에 넣어 둔 돈에 ${pct}%씩 붙어요`,
  amount: (won: number) => `지금이면 ${won.toLocaleString("ko-KR")}원`,
  notice: "부모님이 주실 때 붙어요. 아직 받은 건 아니에요.",
  zero: "목표에 돈을 넣으면 이자가 붙어요.",
};

export const historyTitle = "들어오고 나간 돈";
export const empty = {
  title: "아직 기록이 없어요",
  body: "부모님이 용돈을 넣어 주시면 여기에 보여요",
};
export const inLabel = "들어옴";
export const outLabel = "나감";
export const notice = "쓴 돈과 모은 돈이 여기 다 적혀요. 남은 돈이 맞는지 가끔 세어 봐요.";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
