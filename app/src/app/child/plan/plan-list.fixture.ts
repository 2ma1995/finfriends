// 🔴 데이터는 DB(`@/modules/plan`)가 준다. 여기 남은 것은 문구뿐이다.

export const empty = {
  title: "적어둔 계획이 없어요",
  body: "나가기 전에 얼마 쓸지 적어 두면 돌아와서 맞춰볼 수 있어요",
};

export const newLabel = "계획 카드 적기";
export const savedNotice = "적어뒀어요. 쓰고 와서 맞춰볼까요?";
export const sections = { todo: "아직 안 맞춰봤어요", done: "맞춰본 계획" };

export const recordTitle = "얼마 썼는지 적기";
/** 🔴 카드가 대신 적어 주지 않는다. 아이가 적는 게 학습이고 이건 참고다 (D19) */
export const cardTitle = "카드 내역에서 찾기";
export const cardMockBadge = "예시 · 카드 연동 전";
export const cardHint = "눌러서 채운 뒤 맞는지 보고 고쳐도 돼요.";
export const cardSame = "적은 금액과 똑같아요!";
/** 🔴 「틀렸어요」가 아니다. 차이를 보여주고 다음에 더 잘 적게 한다 */
export const cardGap = (gap: number) =>
  gap > 0
    ? `적은 것보다 ${gap.toLocaleString("ko-KR")}원 더 썼네요. 다음엔 더 맞춰볼까요?`
    : `적은 것보다 ${Math.abs(gap).toLocaleString("ko-KR")}원 덜 썼네요.`;
export const amountLabel = "실제로 쓴 돈";
export const categoryLabel = "무엇을 샀나요";
export const recordLabel = "맞춰보기";
export const seeRetroLabel = "결과 보기 →";
export const metBadge = "지킴";
export const overBadge = "넘김";
export const byGuardianBadge = "부모님이 적음";

/** 🔴 「안 돼요」로 끝내지 않는다 (ACE-1.1) */
export const errors: Record<string, string> = {
  ALREADY: "이 계획은 이미 맞춰봤어요.",
  BAD_AMOUNT: "0원부터 1,000,000원까지 적을 수 있어요.",
  NOT_ENOUGH: "용돈보다 많이 쓴 걸로 적었어요. 부모님께 말해 주세요.",
  NOT_FOUND: "찾을 수 없어요.",
};

/** 🔴 넘겨도 별을 빼앗지 않는다 (P-03). 맞춰보는 것 자체가 목적이다 */
export const hint = "넘겨도 괜찮아요. 맞춰보는 게 중요해요.";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
