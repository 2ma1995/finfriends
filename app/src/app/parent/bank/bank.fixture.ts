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

export const balanceLabel = "지금 남은 용돈";
export const topUpTitle = "용돈 넣기";
export const savedNotice = "적어뒀어요. 아이 화면에 바로 보입니다.";

export const topUpErrors: Record<string, string> = {
  BAD_AMOUNT: "정해진 금액만 넣을 수 있어요.",
  NO_CHILD: "먼저 아이를 등록해 주세요.",
  NOT_ENOUGH: "지금 남은 용돈보다 많이 뺄 수 없어요.",
};

// ── 기록과 되돌리기 ──────────────────────────────────────────

export const historyTitle = "최근 기록";
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
  NOTHING: "지금 남은 용돈이 없어서 되돌릴 게 없어요.",
  NOT_FOUND: "찾을 수 없어요.",
};

// ── 이자율 ───────────────────────────────────────────────────

/**
 * 이자율 — 🔴 **부모가 직접 주는 이자**다 (§9 근거표 A3 「보호자는 위시리스트 목표에
 * 실제로 이자를 준다」 · 검증 대기). 외부 예적금(F15 · REQ-FUNC-014)과 **다른 기능**이며
 * 그쪽은 P-20(가입 중개 금지) 법률 검토 대기다.
 *
 * 🔴 **지급 주기가 D6 미결**이다. 그래서 「한 번 줄 때」 금액만 보여주고 자동 지급은 없다 —
 *    주기를 임의로 정하면 아이가 기대하는 시점과 어긋난다.
 */
export const interestNotice = {
  body: "아이가 모으기 목표에 넣어 둔 돈에 부모가 이자를 줍니다. 「불리기」 나무가 자라는 실천이 됩니다.",
  todo: "언제 얼마나 줄지(이자 주기)는 아직 정하지 않았습니다 — 지금은 금액만 계산해 보여줍니다.",
};

/** SRS §3 은 미션 관리도 이 화면 안에 뒀다 */
export const missionNotice =
  "아이가 「했어요」를 누르면 승인 대기로 올라옵니다. 승인하면 별이 지급되고 그 영역의 나무가 자랍니다.";
