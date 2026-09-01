// PROTO-DATA: PRC-001 — 🔴 데이터는 DB(`@/modules/mission`)가 준다. 여기 남은 것은 문구뿐이다.

/**
 * 🔴 **이 화면에는 두 가지가 섞여 있다.** 어제 「부모님이 만들어 주신 미션이에요」라고
 *    적었는데 **틀린 말이었다** — 실천하기에서 「해봤어요」를 누른 것도 같은 표에 쌓인다
 *    (`claimPractice` 가 `missions` 행을 만든다). 그래서 줄마다 어디서 왔는지 말한다.
 */
export const intro = "부모님이 준 미션과, 배우고 스스로 한 것이 함께 있어요.";

/** 🔴 어디서 온 줄인지 — 아이는 「내가 한 것」과 「시킨 것」을 구별할 수 있어야 한다 */
export const source = {
  parent: "부모님이 줌",
  lesson: "배워서 한 것",
};

export const sections = {
  todo: "오늘 할 수 있는 것",
  waiting: "부모님 확인을 기다려요",
  settled: "지난 미션",
};

export const doneLabel = "했어요";
/**
 * 🔴 사진은 **선택**이다 (FR-032). 찍을 수 없는 실천(참기·기록하기)도 있다.
 * 🔴 **부모가 보고 나면 바로 지워진다**는 것을 아이에게 말한다 — 아동 이미지다.
 */
export const photoLabel = "사진 보여주기 (안 해도 돼요)";
export const photoNotice = "부모님만 보시고 바로 지워져요.";

/**
 * 🔴 **완료 뒤에도 붙일 수 있어야 한다.** 예전엔 사진칸이 「했어요」 버튼과 같은 폼에만
 *    있어서, 한 번 누르고 나면 붙일 방법이 **아예 없었다.**
 *    아이는 **하고 나서** 찍는다 — 누르기 전에 찍어 두라는 건 어른의 순서다.
 */
export const photoLater = "사진 나중에 보여주기";
export const photoAttached = "📷 사진을 보여줬어요";
export const photoReplace = "다른 사진으로 바꾸기";

/** 🔴 실패를 조용히 넘기지 않는다. 「올라갔겠지」로 넘어가면 안 된다 */
export const photoResult: Record<string, string> = {
  ok: "사진을 보여줬어요. 부모님이 보시면 바로 지워져요.",
  BAD_MIME: "이 사진은 못 올려요. 사진으로 다시 찍어 볼래요?",
  TOO_LARGE: "사진이 너무 커요. 조금 작게 찍어 볼래요?",
  EMPTY: "사진이 비어 있어요. 다시 골라 볼래요?",
  NOT_FOUND: "이 미션에는 지금 사진을 붙일 수 없어요.",
};
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
