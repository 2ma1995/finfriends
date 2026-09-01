// 🔴 데이터는 DB(`@/modules/envelope`)가 준다. 여기 남은 것은 문구뿐이다.

export const title = "봉투";
export const sub = "쓸 곳을 미리 나눠 담아요";

export const walletLabel = (won: number) => `쓸 수 있는 돈 ${won.toLocaleString("ko-KR")}원`;
export const unallocatedLabel = (won: number) => `아직 안 담은 돈 ${won.toLocaleString("ko-KR")}원`;
export const allDone = "다 담았어요";

export const remainingLabel = (won: number) => `${won.toLocaleString("ko-KR")}원 남음`;
/** 🔴 「넘었다」를 벌처럼 말하지 않는다. 사실만 말하고 다음을 묻는다 (P-03) */
export const overLabel = (won: number) => `${won.toLocaleString("ko-KR")}원 넘었어요`;
export const overAsk = "다음엔 얼마로 할까요?";

export const saveLabel = "이렇게 담기";
export const savedNotice = "담았어요!";
export const spentNotice = "봉투 안에서 썼어요. ⭐ 1개!";
export const overNotice = (won: number) =>
  `${won.toLocaleString("ko-KR")}원 넘었어요. 이번엔 별이 안 붙어요. 결제는 됐어요.`;

/** 🔴 실제 연동 전이라는 걸 밝힌다 */
export const mockTitle = "카드에서 온 내역";
export const mockBadge = "카드 연결 전이라 예시 데이터입니다";
export const settleLabel = "봉투에서 빼기";

export const spentTitle = "쓴 내역";
export const withinBadge = "봉투 안";
export const overBadge = "넘음";
export const unclassifiedBadge = "어느 봉투인지 몰라요";

/** 🔴 사후 수정이 소급되지 않는다는 것을 아이에게 미리 말한다 (AC-021-3) */
export const notice = "봉투를 나중에 고쳐도 이미 쓴 것은 그대로예요.";

export const errors: Record<string, string> = {
  OVER_WALLET: "쓸 수 있는 돈보다 많이 담았어요. 줄여서 다시 담아요.",
  BAD_AMOUNT: "금액을 다시 봐주세요.",
  NO_ENVELOPE: "봉투를 찾을 수 없어요.",
  ALREADY: "이미 봉투에서 뺀 결제예요.",
};

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
