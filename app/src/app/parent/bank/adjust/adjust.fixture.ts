/**
 * 보낸 돈 수정하기 — D18.
 *
 * 🔴 **줄을 고치거나 지우지 않는다.** 회계와 같이 **상쇄하는 줄을 새로 적는다** —
 *    고치면 「합이 잔액」이 깨지고, 왜 이렇게 됐는지 아무도 못 본다.
 *
 * 🔴 **보호자가 적은 줄만 되돌린다.** 아이가 한 것(목표에 넣기·쓰기)은 아이 쪽에서 되돌린다 —
 *    보호자가 아이 기록을 임의로 지우면 아이는 자기 장부를 믿을 수 없게 된다.
 */

export const title = "보낸 돈 수정하기";
export const sub = "부모님이 넣은 것만";

export const lead =
  "잘못 넣은 용돈을 되돌립니다. 기록이 지워지지 않고 되돌리는 줄이 한 줄 더 적힙니다.";

/** 🔴 아이 기록은 여기서 못 고친다는 것을 미리 말한다 — 찾다가 「왜 없지」가 된다 */
export const onlyGuardianNotice =
  "아이가 목표에 넣거나 쓴 기록은 여기에 없습니다. 그건 아이 화면에서 아이가 되돌립니다.";

export const fixLabel = "되돌리기";
export const fixReasonPlaceholder = "왜 되돌리나요 (아이가 봅니다)";
export const reversedBadge = "이미 되돌렸어요";

export const fixedNotice = (n: number) => `${n.toLocaleString("ko-KR")}원을 되돌렸어요.`;
/** 🔴 아이가 이미 쓴 돈은 되돌릴 수 없다. 조용히 넘기지 않고 그대로 말한다 */
export const shortNotice = (n: number) =>
  `${n.toLocaleString("ko-KR")}원은 아이가 이미 목표에 넣었거나 써서 되돌리지 못했어요.`;

export const fixErrors: Record<string, string> = {
  NOT_ALLOWED: "아이가 적은 기록은 부모님이 지울 수 없어요. 아이 화면에서 되돌릴 수 있어요.",
  ALREADY: "이미 되돌린 기록이에요.",
  NOTHING: "목표에 넣어 둔 돈은 지금 되돌릴 수 없어요.",
  NOT_FOUND: "찾을 수 없어요.",
};

export const empty = {
  emoji: "✅",
  title: "되돌릴 것이 없어요",
  body: "부모님이 넣은 용돈 중 아직 되돌리지 않은 것이 없습니다.",
  hint: "전체 기록은 「기록」에서 볼 수 있어요",
};

export const historyLink = "전체 기록 보기";
