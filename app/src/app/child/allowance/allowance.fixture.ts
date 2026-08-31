// 🔴 데이터는 DB(`@/modules/allowance`)가 준다. 여기 남은 것은 문구뿐이다.
//
// 두 자료(금감원 익힘책 · 슬기로운 생활금융)가 **가장 강조하는 실천이 용돈기입장 쓰기**다.
// 날짜 · 내용 · 들어온 돈 · 나간 돈 · 남은 돈 다섯 칸을 그대로 옮겼다.

export const title = "용돈 기입장";
export const balanceLabel = (n: number) => `남은 돈 ${n.toLocaleString("ko-KR")}원`;
export const empty = {
  title: "아직 기록이 없어요",
  body: "부모님이 용돈을 넣어 주시면 여기에 보여요",
};
export const inLabel = "들어옴";
export const outLabel = "나감";
export const notice = "쓴 돈과 모은 돈이 여기 다 적혀요. 남은 돈이 맞는지 가끔 세어 봐요.";
export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
