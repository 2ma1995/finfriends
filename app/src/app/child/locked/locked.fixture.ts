// 🔴 문구만. 판정은 `/child/enter` 와 미들웨어가 한다.

/** 아동 모드에서 보호자 경로를 두드렸을 때 */
export const guardianArea = {
  title: "여긴 어른 화면이에요",
  body: ["이 화면은 보호자가 여는 곳이에요.", "부모님께 보여 달라고 해 보세요."],
};

/**
 * 초대 링크로 못 들어온 경우 — `AC-002-2`.
 * 🔴 **사유를 뭉뚱그리지 않는다.** 「만료」와 「이미 연결됨」은 아이에게 다른 말이다 —
 *    하나는 부모님께 다시 요청해야 하고, 하나는 이미 된 것이다.
 */
export const enterFailed: Record<string, { title: string; body: string[] }> = {
  EXPIRED: {
    title: "링크가 오래됐어요",
    body: ["부모님께 새 링크를 다시 만들어 달라고 해 주세요."],
  },
  USED: {
    title: "이미 연결된 링크예요",
    body: ["다른 기기에서 이미 썼어요.", "이 기기에서 쓰려면 부모님께 새 링크를 받아 주세요."],
  },
  NOT_FOUND: {
    title: "이 링크는 쓸 수 없어요",
    body: ["부모님께 새 링크를 다시 만들어 달라고 해 주세요."],
  },
  CONSENT_REQUIRED: {
    title: "보호자 동의가 필요해요",
    body: ["부모님이 동의해 주시면 열려요."],
  },
};

export const backHome = "내 방으로 돌아가기";

/**
 * 어른이 쓰는 자리로 가는 길 — `/unlock` (어긋남 대장 D42).
 *
 * 🔴 **「PIN」도 「잠금」도 안 쓴다.** 아이가 보는 화면이다 —
 *    아이를 밀어내는 말이 아니라 **묻는 형태**로 둔다.
 */
export const guardianLink = "부모님이신가요?";
