// PROTO-DATA: PRC-001 — 🔴 데이터는 DB(`@/modules/mission`)가 준다. 여기 남은 것은 문구뿐이다.

export const sections = {
  todo: "오늘 할 수 있는 것",
  waiting: "부모님 확인을 기다려요",
  settled: "지난 미션",
};

export const doneLabel = "했어요";
export const undoLabel = "아니에요";

/** 🔴 「승인 대기」를 「미실천」과 구별해 말한다 (AC-6.2) */
export const waitingNotice = "이미 한 거예요. 부모님이 보시면 별이 붙어요.";
/** 🔴 거절도 「안 했다」가 아니다. 사유를 그대로 보여준다 */
export const rejectedPrefix = "이번엔 별이 안 붙었어요";
/** 소급 승인 — 늦게 봐도 그날로 반영된다 (ACE-6.2) */
export const backfilledNotice = "늦게 확인됐지만 한 날짜로 반영됐어요";

export const empty = {
  title: "아직 미션이 없어요",
  body: "부모님이 만들어 주시면 여기에 보여요",
};

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
