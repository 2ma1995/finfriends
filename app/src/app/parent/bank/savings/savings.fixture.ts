// 🔴 데이터는 DB(`@/modules/savings`)가 준다. 여기 남은 것은 문구뿐이다.

export const title = "우리 집 적금";

/** 🔴 무엇을 승인하는 것인지 분명히 말한다. 이자는 **보호자가 자기 돈으로** 준다 */
export const notice = {
  title: "받아들이면 이 돈이 만기까지 묶입니다",
  body: "아이가 쓸 수 있는 돈에서 빠지고, 만기에 원금과 이자가 함께 돌아갑니다. 이자는 보호자가 주는 것이고 실제 금융상품이 아닙니다.",
};

export const empty = { title: "신청이 없어요", body: "아이가 적금을 신청하면 여기에 올라옵니다" };
export const requestedTitle = "신청 대기";
export const activeTitle = "진행 중";

export const wantedLabel = (pct: number) => `아이가 바란 이자 ${pct}%`;
export const houseLabel = (pct: number | null) =>
  pct === null ? "우리 집 이자를 아직 정하지 않았습니다" : `우리 집 이자 ${pct}%`;
/** 🔴 아이가 더 바랐다는 사실을 조용히 넘기지 않는다. 답을 하는 자리다 */
export const wantedMore = "아이가 더 바랐습니다. 이 약속만 올려 줄 수 있어요.";
export const pctLabel = "이 약속의 이자율";
export const acceptLabel = "받아들이기";
export const rejectLabel = "이번엔 아니요";
export const reasonPlaceholder = "아이가 볼 이유를 적어 주세요";

export const interestPreview = (won: number) => `만기에 이자 ${won.toLocaleString("ko-KR")}원을 주게 됩니다`;

/**
 * 🔴 **여기가 이자율을 정하는 유일한 자리다.**
 *
 * 통장 화면에 「이자율 설정」 칸이 따로 있었는데 뺐다 — 같은 값을 두 곳에서 정하면
 * 갈리고, 이자율은 아이가 **신청하는 순간** 그 약속에 박히므로 통장에서 바꿔도
 * 이미 올라온 신청은 안 바뀐다. 보호자는 바꿨다고 믿는데 여기엔 옛 숫자가 남는다
 * (어긋남 대장 D28-b).
 *
 * 그래서 여기서 정한 값이 **다음 신청의 기본값**도 된다. 그 사실을 말하지 않으면
 * 보호자는 이 숫자가 이 한 건에만 쓰이는 줄 안다.
 */
export const pctCarryNote = "여기서 정한 이자율이 우리 집 기본이 됩니다. 다음에 아이가 신청할 때 이 값으로 올라와요.";
export const daysLeft = (d: number) => `${d}일 남음`;
export const maturedLabel = "만기가 됐어요";
export const completeLabel = "다 됐어요 — 원금과 이자 주기";
/** 🔴 ⭐10 은 SRS 가 정한 값이다. 큰 보상이므로 무엇을 주는지 미리 말한다 */
export const completeNotice = "누르면 원금과 이자가 아이 통장으로 가고 ⭐10이 붙습니다.";

export const acceptedNotice = "받아들였어요. 아이 화면에 바로 보입니다.";
export const rejectedNotice = "아이에게 이유가 전해졌어요.";
export const doneNotice = "원금과 이자를 줬어요. ⭐10이 붙었습니다.";

export const errors: Record<string, string> = {
  NOT_ENOUGH: "아이가 쓸 수 있는 돈이 신청 금액보다 적어졌어요. 용돈을 채워 주시거나 아이에게 다시 신청하게 해주세요.",
  NOT_FOUND: "찾을 수 없어요. 만기 전이라면 아직 줄 수 없습니다.",
};

export const needLogin = { title: "로그인이 필요해요", body: "보호자 계정으로 로그인해 주세요" };
