// PROTO-DATA: PRC-004 — 🔴 데이터는 DB(`@/modules/wishlist`)가 준다.
// 여기 남은 것은 **문구뿐**이다. 이 형식이 나머지 화면을 옮길 때의 본이다.

export const rankNotice = (left: number) =>
  left > 0 ? `순위 바꾸기는 이번 달 ${left}번 남았어요` : "순위는 다음 달에 다시 바꿀 수 있어요";

export const empty = {
  title: "아직 갖고 싶은 게 없어요",
  body: "하나 정하면 모으는 재미가 생겨요",
  hint: "부모님과 같이 정해 보세요",
};

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
