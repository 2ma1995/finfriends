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

/**
 * 🔴 **자주 쓰는 금액은 버튼, 그 밖은 입력란**이다 (어긋남 대장 D53).
 *    전에는 세 값만 받았다 — 잔액이 시연용 숫자였을 때의 규칙이다.
 *    지금은 원장에 「얼마 줬다」를 적는 것이라 금액을 묶을 이유가 없다.
 */
export const customLabel = "직접 넣기";
export const customPlaceholder = "금액";
export const customSubmit = "넣기";
/** 🔴 상한을 미리 말한다 — 넣고 나서 거절되면 왜 안 되는지 모른다 */
export const customHint = "1원부터 500,000원까지 넣을 수 있어요.";

/**
 * 🔴 **버튼이 바로 넣지 않는다는 것을 말한다** (D59). 전에는 누르는 순간 적혔으므로
 *    부모가 예전 동작을 기억하고 있으면 눌러 놓고 넣은 줄 안다.
 */
export const presetHint = "금액 버튼을 누를수록 더해집니다. 「넣기」를 눌러야 들어가요.";

/** 🔴 더하기만 되면 갇힌다 — 비울 방법을 준다 */
export const clearLabel = "금액 비우기";

/** 🔴 손으로 적어 넘긴 경우. 버튼은 미리 막히지만 입력은 막을 수 없다 */
export const overMaxNotice = "한 번에 500,000원까지 넣을 수 있어요. 금액을 줄여 주세요.";
export const savedNotice = "적어뒀어요. 아이 화면에 바로 보입니다.";

export const topUpErrors: Record<string, string> = {
  BAD_AMOUNT: "정해진 금액만 넣을 수 있어요.",
  NO_CHILD: "먼저 아이를 등록해 주세요.",
  NOT_ENOUGH: "지금 남은 용돈보다 많이 뺄 수 없어요.",
};

// ── 기록 · 수정으로 가는 길 ─────────────────────────────────

/**
 * 🔴 **보는 것과 고치는 것을 나눈다** — 기록은 `/parent/bank/history`,
 *    되돌리기는 `/parent/bank/adjust` 가 맡는다.
 *    한 화면에서 목록을 훑다가 실수로 되돌리면 아이 화면의 숫자가 즉시 바뀐다.
 *    문구도 각 화면이 갖는다 — 여기 두면 세 곳이 같은 말을 따로 갖게 된다.
 */
export const adjustLabel = "보낸 돈 수정하기";
export const historyLabel = "기록";

/** SRS §3 은 미션 관리도 이 화면 안에 뒀다 */
export const missionNotice =
  "아이가 「했어요」를 누르면 승인 대기로 올라옵니다. 승인하면 별이 지급되고 그 영역의 나무가 자랍니다.";
