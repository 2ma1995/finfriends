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
/**
 * 우리 집 적금 — D25.
 * 🔴 **은행 적금이 아니다.** 부모님과 하는 약속이고 이자도 부모님이 준다.
 *    아이가 실제 금융상품으로 오해하면 안 된다 (P-20 가입 중개 금지).
 */
/**
 * 🔴 **지난 기록은 딴 화면이다** (사용자 지적: 「한 공간에 다 나와서 복잡하다」).
 *    통장에는 **지금 하고 있는 저금 하나**만 남고, 끝난 것은 링크로 간다.
 */
export const savings = {
  pastTitle: "지난 저금",
  pastLink: "지난 저금 보기",
  pastEmpty: { title: "아직 끝난 저금이 없어요", body: "저금을 시작하면 여기에 쌓여요" },
  title: "우리 집 저금",
  what: "정한 기간 동안 안 쓰고 두면 부모님이 이자를 주세요.",
  /** 🔴 학습 `save-3` 이 가르치는 두 가지를 그대로 쓴다 */
  kinds: {
    DEPOSIT:     { label: "예금", hint: "목돈을 한 번에 넣고 두기" },
    INSTALLMENT: { label: "적금", hint: "매주 조금씩 넣기" },
  },
  kindLabel: "어떻게 모을래요?",
  perPeriodLabel: "한 주에 얼마",
  periodsLabel: "몇 주 동안",
  /** 🔴 자리표시자만 둔다. 숫자는 폼이 채운다 — 함수는 클라이언트로 못 넘긴다 */
  totalPreview: "{n}주 동안 모으면 {won}원이 돼요",
  depositPreview: "{won}원을 {n}달 동안 두는 거예요",
  interestPreview: "끝나면 {won}원을 더 받아요",
  /** 🔴 아이가 직접 넣는다. 자동이면 실천이 아니다 */
  payLabel: (n: number) => `이번 주 ${n.toLocaleString("ko-KR")}원 넣기`,
  paidThisWeek: "이번 주는 넣었어요. 다음 주에 또 넣어요.",
  progress: (paid: number, total: number) => `${total}주 중 ${paid}주 넣음`,
  allPaid: "다 넣었어요! 부모님이 확인해 주실 거예요",
  skipOk: "이번 주를 건너뛰어도 회차는 없어지지 않아요.",
  notBank: "은행 적금이 아니라 부모님과 하는 약속이에요.",
  /** 🔴 막지 않는다. 이자는 부모님이 받아 주실 때 정한다 */
  rateLater: "이자는 부모님이 받아 주실 때 정해 주세요.",
  /**
   * 🔴 **고르게 해놓고 무시하면 안 된다.** 그래서 「선택」이 아니라 「제안」이다 —
   *    누르기 전에 정하는 사람이 누구인지 먼저 말한다.
   */
  wantLabel: "끝나면 얼마를 더 받고 싶어요?",
  /**
   * 🔴 **아이 화면에 `%` 를 쓰지 않는다** (`AC-031-5`). 저학년은 퍼센트를 못 읽는다 —
   *    「5%」는 아무 감각도 안 준다. **정액 비례**로 말한다: 「10,000원 모으면 500원」.
   */
  /** 🔴 진행 중인 저금은 **실제 받을 금액**으로 말한다. `%` 는 쓰지 않는다 (AC-031-5) */
  wantNotice: "지금 우리 집에서 정한 만큼이에요. 더 받고 싶으면 말해 볼 수 있어요.",
  wantNoRate: "아직 우리 집 이자가 없어요. 얼마면 좋겠는지 말해 보세요.",
  /** 🔴 갖고 싶은 것에 넣어 둔 돈에는 이자가 안 붙는다. 위의 이자 칸을 없앴으므로 여기서 말한다 */
  onlyOnSavings: "이자는 저금한 돈에만 붙어요.",
  wantWho: "얼마로 할지는 부모님이 정해요.",
  wantedShown: (won: number) => `${won.toLocaleString("ko-KR")}원을 바랐어요`,
  gaveInstead: (won: number) => `부모님이 ${won.toLocaleString("ko-KR")}원으로 해주셨어요`,
  sameAsWanted: "바란 대로 해주셨어요!",

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
  /**
   * 🔴 **「거절」이라는 단어를 쓰지 않는다** (`AC-031-4`). 아이에게 거절은 끝으로 읽힌다 —
   *    부모가 안 된다고 한 것은 **다시 이야기할 일**이지 닫힌 문이 아니다.
   */
  rejectedBadge: "다시 이야기해요",
  talkAgain: "다시 이야기해요",
  talkAgainBody: "부모님과 이야기하고 다시 신청할 수 있어요.",
  lockedTitle: "적금에 넣은 돈",
};

export const errors: Record<string, string> = {
  ALREADY_OPEN: "이미 하고 있는 적금이 있어요. 하나씩 해요.",
  BAD_GOAL: "무엇을 위해 모으는지 적어 주세요.",
  BAD_AMOUNT: "1,000원부터 넣을 수 있어요.",
  BAD_MONTHS: "1달부터 12달까지 정할 수 있어요.",
  NOT_ENOUGH: "쓸 수 있는 돈보다 많이 넣을 수 없어요.",
  PAID_THIS_WEEK: "이번 주는 이미 넣었어요. 다음 주에 또 넣어요.",
  ALL_PAID: "다 넣었어요. 더 넣지 않아도 돼요.",
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
/**
 * 🔴 **「옮김」이 넷을 한 말로 뭉뚱그리고 있었다.** `MOVED_CODES` 에 적금이 더해지면서
 *    「자전거 적금에 넣었어요」가 **「목표로 옮김」**으로 표시됐다 —
 *    아이에게 **목표(갖고 싶은 것)와 적금은 다른 것**이고, 하나는 언제든 되돌릴 수 있고
 *    하나는 깨야 나온다. 부모 화면 담당이 같은 문제를 자기 화면에서 먼저 찾았다.
 *
 * 🔴 **되돌아온 것도 갈라 말한다.** 「목표에서 되돌림」과 「적금이 끝남」은
 *    아이가 한 일이 다르다 — 하나는 마음을 바꾼 것이고 하나는 끝까지 지킨 것이다.
 */
export const movedLabel: Record<string, string> = {
  WISH_SET_ASIDE:  "목표로 옮김",
  WISH_RELEASE:    "목표에서 되돌림",
  SAVINGS_LOCK:    "적금·예금으로 옮김",
  SAVINGS_RELEASE: "적금·예금에서 돌아옴",
};
export const notice = "쓴 돈과 모은 돈이 여기 다 적혀요. 남은 돈이 맞는지 가끔 세어 봐요.";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };

/**
 * 계획 카드로 가는 길 — 🔴 **봉투가 있던 자리다** (D41).
 * 돈 화면에서 소비를 적는 곳으로 갈 수 없으면 아이는 그 기능을 못 찾는다.
 */
export const planLink = { label: "쓸 계획 적기", hint: "쓰기 전에 적어요" };

/**
 * 갖고 싶은 것 — 🔴 **들어오고 나간 돈 «위»에 둔다** (사용자 요청).
 *
 * 내역은 **지나간 것**이고 목표는 **앞으로 올 것**이다. 통장을 여는 이유는
 * 「얼마 남았지」이지 「지난달에 뭘 샀지」가 아니다 — 목표가 먼저다.
 *
 * 🔴 **여기서 돈을 넣지 않는다.** 넣는 자리는 「갖고 싶은 것」 화면 하나다.
 *    두 군데서 넣게 하면 한도(`MAX_DEPOSIT`)와 별 판정이 두 경로로 갈린다.
 *    줄을 누르면 그 화면으로 간다.
 */
export const wishTitle = "갖고 싶은 것";
export const wishEmpty = "아직 갖고 싶은 게 없어요";
export const wishRank = (n: number) => `${n}순위`;
