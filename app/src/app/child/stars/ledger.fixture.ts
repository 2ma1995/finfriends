// PROTO-DATA: STR-001 — 🔴 이 파일은 **더 이상 화면이 쓰지 않는다.**
//
// `/child/stars` 는 DB(`@/modules/star-ledger`)를 본다. 남겨 둔 이유는
// 기기 토큰이 없을 때 보여 줄 안내 문구가 여기 있기 때문이다.
// 나머지 18개 화면이 옮겨 가면 이 주석 형식이 본이 된다.

export const notice = "별은 옷장에서만 쓸 수 있어요. 돈으로 바꾸지는 않아요.";

/** 기기가 등록되지 않았을 때 */
export const noDevice = {
  title: "아직 준비가 안 됐어요",
  body: "부모님이 이 기기를 등록해 주셔야 열려요",
};

/** 보호자가 동의를 마치지 않았거나 철회했을 때 (REQ-NF-008) */
export const consentRequired = {
  title: "보호자 동의가 필요해요",
  body: "부모님께 알려 주세요",
};
