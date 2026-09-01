// 🔴 데이터는 DB(`@/modules/wishlist`)가 준다. 여기 남은 것은 문구뿐이다.

export const empty = {
  title: "갖고 싶은 걸 적어 봐요",
  body: "목표를 정하면 얼마나 모았는지 보여줄게요",
};

export const addTitle = "갖고 싶은 것 적기";
export const nameLabel = "무엇을";
export const namePlaceholder = "예: 물감 세트";
export const targetLabel = "얼마짜리";
export const targetPlaceholder = "24000";
export const addLabel = "적어두기";

export const depositLabel = "넣기";
/** 🔴 별이 아니라 **용돈**이다. 둘은 절대 섞이지 않는다 (P-21) */
export const walletLabel = (n: number) => `쓸 수 있는 용돈 ${n.toLocaleString("ko-KR")}원`;
export const walletEmpty = "아직 받은 용돈이 없어요. 부모님이 넣어 주시면 모을 수 있어요.";
export const depositPlaceholder = "1000";
export const removeLabel = "지우기";
export const rankUpLabel = "↑ 순위 올리기";

export const addedNotice = "적어뒀어요. 이제 모아 볼까요?";
export const savedNotice = "넣었어요!";
export const rankedNotice = "순위를 바꿨어요.";

/** 🔴 「안 돼요」로 끝내지 않는다. 무엇을 하면 되는지 말한다 (ACE-1.1) */
export const errors: Record<string, string> = {
  TOO_MANY: "갖고 싶은 건 5개까지 적을 수 있어요. 하나를 지우고 적어 봐요.",
  BAD_NAME: "무엇을 갖고 싶은지 적어 주세요.",
  BAD_TARGET: "1,000원부터 1,000,000원까지 적을 수 있어요.",
  BAD_AMOUNT: "한 번에 100,000원까지 넣을 수 있어요.",
  RANK_USED: "순위는 한 달에 한 번만 바꿀 수 있어요. 다음 달에 또 바꿀 수 있어요.",
  NOT_ENOUGH: "용돈이 모자라요. 지금 있는 만큼만 넣을 수 있어요.",
  NOT_FOUND: "찾을 수 없어요.",
};

/** 🔴 순위를 자주 바꾸면 목표가 목표가 아니게 된다 (PRC-004) */
export const rankNotice = (left: number) =>
  left > 0 ? "순위는 이번 달에 한 번 바꿀 수 있어요." : "이번 달 순위 변경을 이미 썼어요.";

/** 🔴 퍼센트가 0%여도 넣은 건 넣은 것이다. 남은 금액으로 말한다 */
export const remainingLabel = (won: number) => `${won.toLocaleString("ko-KR")}원 더 모으면 돼요`;
export const reachedLabel = "다 모았어요!";

/** 🔴 아이 화면에 `%` 를 쓰지 않는다 (AC-031-5). 다음 별까지 **금액**으로 말한다 */
export const nextStarLabel = (won: number) => `${won.toLocaleString("ko-KR")}원 더 모으면 ⭐`;
export const allStarsLabel = "별을 다 받았어요";
export const milestoneHint = "모으는 동안 별을 세 번 받아요.";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
