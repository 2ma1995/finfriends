// 🔴 데이터는 DB(`@/modules/allowance`)가 준다. 여기 남은 것은 문구뿐이다.
//
// 두 자료(금감원 익힘책 · 슬기로운 생활금융)가 **가장 강조하는 실천이 용돈기입장 쓰기**다.
// 날짜 · 내용 · 들어온 돈 · 나간 돈 · 남은 돈 다섯 칸을 그대로 옮겼다.

export const title = "내 통장";
export const totalTitle = "내 돈";
export const balanceTitle = "쓸 수 있는 돈";
export const savedTitle = "목표에 넣어 둔 돈";
/** 🔴 떼어 둔 돈이 없어진 게 아니라는 걸 말한다 */
export const setAsideNotice = "목표에 넣어 둔 돈도 내 돈이에요. 아직 안 썼어요.";

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

/**
 * 우리 집 적금 — D25.
 * 🔴 **은행 적금이 아니다.** 부모님과 하는 약속이고 이자도 부모님이 준다.
 *    아이가 실제 금융상품으로 오해하면 안 된다 (P-20 가입 중개 금지).
 */
export const savings = {
  title: "우리 집 적금",
  what: "정한 기간 동안 안 쓰고 두면 부모님이 이자를 주세요.",
  notBank: "은행 적금이 아니라 부모님과 하는 약속이에요.",
  noRate: "부모님이 이자를 정하면 신청할 수 있어요.",
  goalLabel: "무엇을 위해",
  goalPlaceholder: "예: 자전거",
  amountLabel: "얼마를",
  monthsLabel: "몇 달 동안",
  ask: "부모님께 신청하기",
  waiting: "부모님이 보고 계세요",
  waitingBody: "받아 주시면 그때부터 돈이 묶여요",
  active: (days: number) => `${days}일 더 지나면 끝나요`,
  matured: "다 됐어요! 부모님이 확인해 주실 거예요",
  willGet: (won: number) => `끝나면 이자 ${won.toLocaleString("ko-KR")}원을 받아요`,
  noInterest: "이번엔 이자가 없어요",
  breakLabel: "지금 깨기",
  /** 🔴 누르기 전에 대가를 말한다. 자료가 가르치는 그대로다 */
  breakWarn: "지금 깨면 이자를 못 받아요. 넣은 돈만 돌아와요.",
  brokeNotice: "적금을 깼어요. 넣은 돈이 돌아왔어요.",
  askedNotice: "신청했어요. 부모님이 보시면 시작돼요.",
  doneBadge: "끝까지 지켰어요 ⭐",
  brokenBadge: "중간에 깼어요",
  rejectedBadge: "이번엔 안 됐어요",
  lockedTitle: "적금에 넣은 돈",
};

export const errors: Record<string, string> = {
  ALREADY_OPEN: "이미 하고 있는 적금이 있어요. 하나씩 해요.",
  BAD_GOAL: "무엇을 위해 모으는지 적어 주세요.",
  BAD_AMOUNT: "1,000원부터 넣을 수 있어요.",
  BAD_MONTHS: "1달부터 12달까지 정할 수 있어요.",
  NOT_ENOUGH: "쓸 수 있는 돈보다 많이 넣을 수 없어요.",
  NOT_FOUND: "찾을 수 없어요.",
};

export const historyTitle = "들어오고 나간 돈";
export const empty = {
  title: "아직 기록이 없어요",
  body: "부모님이 용돈을 넣어 주시면 여기에 보여요",
};
export const inLabel = "들어옴";
export const outLabel = "나감";
/** 🔴 목표로 옮긴 건 **쓴 게 아니다.** 같은 「나감」으로 보이면 없어진 줄 안다 */
export const movedLabel = "목표로 옮김";
export const notice = "쓴 돈과 모은 돈이 여기 다 적혀요. 남은 돈이 맞는지 가끔 세어 봐요.";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
