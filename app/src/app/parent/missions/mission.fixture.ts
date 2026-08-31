// PROTO-DATA: PRC-001 · PRC-003 — 🔴 데이터는 DB(`@/modules/mission`)가 준다. 여기 남은 것은 문구뿐이다.

/** 5건 이상이면 일괄 승인이 열린다 (PRC-003) */
export const BULK_THRESHOLD = 5;

/** 소급 지급 — 승인하면 한 날짜 기준으로 반영된다 (PRC-002) */
export const retroNotice = {
  title: "아직 반영되지 않았어요",
  body: "아이는 이미 했습니다. 승인하면 한 날짜 기준으로 소급해서 반영됩니다",
};

export const approveLabel = "승인";
export const rejectLabel = "아니요";
export const bulkLabel = "모두 승인";
/** 🔴 사유 없이 거절하지 않는다 — 아이 화면에서 「미실천」과 구별되지 않는다 (AC-6.2) */
export const reasonPlaceholder = "아이가 볼 이유를 적어 주세요";

export const empty = { title: "기다리는 미션이 없어요", body: "아이가 미션을 마치면 여기에 올라옵니다" };
export const needLogin = { title: "로그인이 필요해요", body: "보호자 계정으로 로그인해 주세요" };
