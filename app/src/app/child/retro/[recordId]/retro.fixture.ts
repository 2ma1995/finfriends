// PROTO-DATA: PLN-002 · PLN-003 — 🔴 데이터는 DB(`@/modules/plan`)가 준다. 여기 남은 것은 문구뿐이다.

export const confirmLabel = "확인했어요";
export const otherBranchLabel = (met: boolean) => (met ? "계획 넘김" : "계획 지킴");

export const notFound = { title: "기록을 찾지 못했어요", body: "내 방으로 돌아가 볼까요?" };
export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
