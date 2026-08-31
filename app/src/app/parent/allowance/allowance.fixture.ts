// 🔴 데이터는 DB(`@/modules/allowance`)가 준다. 여기 남은 것은 문구뿐이다.

export const title = "용돈 주기";
/** 🔴 앱이 돈을 보관한다는 오해를 만들면 안 된다. 첫 줄에서 분명히 말한다 (D18) */
export const notice = {
  title: "실제 돈은 여기 없습니다",
  body: "돈은 현금이나 부모님 카드로 직접 주시고, 여기에는 「얼마 줬는지」만 적습니다. 아이 화면에서 그만큼 쓰고 모을 수 있게 됩니다.",
};
export const starSeparation = "별과 용돈은 서로 바꿀 수 없습니다. 별은 방 꾸미기에만 씁니다.";

export const amountLabel = "얼마를 주셨나요";
export const memoLabel = "한 줄 메모 (아이가 봅니다)";
export const memoPlaceholder = "예: 9월 용돈";
export const submitLabel = "적어두기";
export const balanceLabel = (n: number) => `지금 남은 용돈 ${n.toLocaleString("ko-KR")}원`;
export const historyTitle = "최근 기록";
export const savedNotice = "적어뒀어요. 아이 화면에 바로 보입니다.";
export const errorNotice = "1원부터 500,000원까지 적을 수 있어요.";
export const needLogin = { title: "로그인이 필요해요", body: "보호자 계정으로 로그인해 주세요" };
export const noChild = { title: "아이가 없어요", body: "먼저 자녀를 등록해 주세요" };
