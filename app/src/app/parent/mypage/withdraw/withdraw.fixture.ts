/**
 * 탈퇴 확인 화면 문구 — `FR-041` · 어긋남 대장 D36.
 *
 * 🔴 **되돌릴 수 없는 것을 진행 전에 말한다** (`AC-041-1`).
 *    「데이터를 삭제합니다」로는 부족하다 — 보호자가 **무엇을 잃는지** 알아야 한다.
 */

export const title = "탈퇴하기";

export const warn = {
  title: "되돌릴 수 없어요",
  body: "모은 별과 자란 나무는 되돌릴 수 없습니다. 탈퇴하면 아이의 기록이 모두 지워지고, 다시 가입해도 복구되지 않아요.",
};

/** 🔴 숫자로 보여준다. 「기록이 지워집니다」는 크기를 감춘다 */
export const loseLabels = {
  stars: "모은 별",
  trees: "자란 나무",
  missions: "해낸 미션",
  allowance: "남은 용돈",
};

/**
 * 🔴 **선불 잔액은 우리가 환불하지 않는다.** 실제 돈은 제휴사에 있고(`ADR-004`)
 *    환불은 발행사가 한다. 우리가 「환불해 드립니다」라고 말하면 안 된다.
 */
export const refundNotice = {
  title: "카드에 남은 돈은 따로입니다",
  body: "카드에 충전된 돈은 카드사가 환불합니다. 이 앱에서 처리되지 않으니 카드사 안내를 따라 주세요.",
};

/** 🔴 별은 앱 안의 재화다. 현금과 분리돼 있으므로 환불 대상이 아니다 (P-21) */
export const starNotice = "별은 앱 안에서만 쓰는 것이라 환불되지 않습니다.";

export const confirmLabel = "위 내용을 읽었고, 되돌릴 수 없다는 것을 압니다";
export const submitLabel = "탈퇴하기";
export const cancelLabel = "그만두기";

export const needConfirm = "되돌릴 수 없다는 것에 동의해 주셔야 진행할 수 있어요.";
export const failed = "지우지 못했어요. 잠시 뒤 다시 시도해 주세요.";

/** 탈퇴가 끝난 뒤 로그인 화면에서 보여줄 문구 */
export const doneNotice = "탈퇴가 끝났습니다. 기록이 모두 지워졌어요.";
