import { i } from "@/lib/korean";

/**
 * 아이 통장(보호자용) 문구 — SRS §3 · 어긋남 대장 D18 · D21.
 *
 * 🔴 **데이터는 여기 없다.** `modules/bank.getBank` 와 `modules/allowance.getHistory`
 *    가 DB 에서 읽는다.
 *
 * 「용돈 주기」 화면(`/parent/allowance`)의 문구를 여기로 합쳤다 — 화면이 둘이면
 * 잔액도 둘이 되고, 실제로 두 화면이 60,000원과 20,000원을 따로 보여주고 있었다.
 */

/**
 * 🔴 화면 맨 위에. **앱이 돈을 보관한다는 오해를 만들면 안 된다** (D18).
 *    앱이 가치를 보관하면 선불전자지급수단이 되어 전자금융업 등록 대상이 되고,
 *    아동 명의까지 겹친다.
 */
export const moneyNotice = {
  title: "실제 돈은 여기 없습니다",
  body:
    "돈은 현금이나 부모님 카드로 직접 주시고, 여기에는 「얼마 줬는지」만 적습니다. " +
    "아이 화면에서 그만큼 쓰고 모을 수 있게 됩니다.",
};

/** 🔴 별↔용돈 전환 경로가 없다는 사실을 보호자에게 말한다 (P-21 · REQ-NF-010 · S4) */
export const starSeparation = "별과 용돈은 서로 바꿀 수 없습니다. 별은 방 꾸미기에만 씁니다.";

/** 카드가 사용 중이 아니면 아이가 이 돈을 실제로 쓸 곳이 없다 */
export const cardNeeded = "카드를 등록하면 아이가 이 돈을 실제로 쓸 수 있어요.";

/**
 * 🔴 **세 갈래를 한 자리에 보여준다.** 「쓸 수 있는 돈」만 크게 두면
 *    목표에 묶인 돈이 사라진 것처럼 보인다 — 20,000원을 줬는데 10,500원만 떴다.
 *    이 세 줄은 **이자 카드 밖**에 있어야 한다. 이자는 부가 기능인데
 *    그 안에 원금을 두면, 이자율을 안 정한 부모에게는 원금이 아예 안 보인다.
 */
export const walletLabels = {
  // 🔴 아이 이름은 무엇이든 들어온다. 「민수이 가진 돈」이 되면 안 된다
  total: (name: string) => `${i(name)} 가진 돈`,
  free: "지금 쓸 수 있는 돈",
  setAside: "목표에 넣어 둔 돈",
  /** 🔴 숫자만 보면 「어디 갔지」가 된다. 쓴 게 아니라는 것을 그 자리에서 말한다 */
  setAsideNote: "쓴 게 아니라 목표에 묶어 둔 돈이에요.",
  locked: "적금에 넣은 돈",
  /** 🔴 만기 전에는 못 쓴다는 것을 말한다. 안 적으면 부모가 쓸 수 있는 줄 안다 */
  lockedNote: "「우리 집 적금」에 묶인 돈이에요. 만기가 되면 이자와 함께 돌아옵니다.",
};
export const topUpTitle = "용돈 넣기";
export const savedNotice = "적어뒀어요. 아이 화면에 바로 보입니다.";

export const topUpErrors: Record<string, string> = {
  BAD_AMOUNT: "정해진 금액만 넣을 수 있어요.",
  NO_CHILD: "먼저 아이를 등록해 주세요.",
  NOT_ENOUGH: "지금 남은 용돈보다 많이 뺄 수 없어요.",
};

// ── 기록과 되돌리기 ──────────────────────────────────────────

export const historyTitle = "최근 기록";
/** 🔴 목표로 옮긴 줄에 붙인다. 「나감」으로 보이면 부모도 쓴 걸로 읽는다 */
export const movedBadge = "목표로 옮김";
/** 🔴 줄을 고치는 게 아니라 반대 줄을 적는다는 사실을 보호자에게 말한다 */
export const fixNotice = "고치면 기록이 지워지지 않고, 되돌리는 줄이 한 줄 더 적힙니다.";
export const fixLabel = "고치기";
export const fixReasonPlaceholder = "왜 고치나요 (아이가 봅니다)";
export const reversedBadge = "되돌림";
export const fixedNotice = (n: number) => `${n.toLocaleString("ko-KR")}원을 되돌렸어요.`;
/** 🔴 아이가 이미 쓴 돈은 되돌릴 수 없다. 조용히 넘기지 않고 그대로 말한다 */
export const shortNotice = (n: number) =>
  `${n.toLocaleString("ko-KR")}원은 아이가 이미 목표에 넣었거나 써서 되돌리지 못했어요.`;
export const fixErrors: Record<string, string> = {
  NOT_ALLOWED: "아이가 적은 기록은 부모님이 지울 수 없어요. 아이 화면에서 되돌릴 수 있어요.",
  ALREADY: "이미 되돌린 기록이에요.",
  /**
   * 🔴 「남은 용돈이 없다」고 하면 안 된다 — 목표에 8,000원이 묶여 있으면
   *    부모 눈에는 돈이 있다. 그리고 아이가 목표를 지우면(`WISH_RELEASE`)
   *    그 돈은 다시 쓸 수 있게 되므로 **「지금은」**이라고 말한다.
   */
  NOTHING: "목표에 넣어 둔 돈은 지금 되돌릴 수 없어요.",
  NOT_FOUND: "찾을 수 없어요.",
};

/**
 * 봉투 재배분 이력 — `AC-020-3` 「재배분 이력이 부모 화면에 남는다」.
 *
 * 🔴 **잘못을 표시하는 목록이 아니다.** 아이가 봉투를 옮긴 것 자체는 잘못이 아니고,
 *    요구는 **부모가 바뀐 것을 아는 것**이다. 경고색을 쓰면 또 다그치는 화면이 된다 (`P-03`).
 */
export const reallocTitle = "봉투를 바꾼 기록";
export const reallocNotice =
  "아이가 봉투에 담는 금액을 바꾸면 여기에 남습니다. 바꾸는 것은 잘못이 아니고, 무엇이 달라졌는지 보시라고 적어 둡니다.";
export const reallocEmpty = "아직 바꾼 적이 없어요.";

/** SRS §3 은 미션 관리도 이 화면 안에 뒀다 */
export const missionNotice =
  "아이가 「했어요」를 누르면 승인 대기로 올라옵니다. 승인하면 별이 지급되고 그 영역의 나무가 자랍니다.";
