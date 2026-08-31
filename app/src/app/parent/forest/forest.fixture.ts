// PROTO-DATA: GRW-005 — 백엔드 완료 시 이 파일을 지우고 GRW-004(숲 스냅샷) 호출로 대체한다
export type Delta = { readonly label: string; readonly from: string; readonly to: string; readonly improved: boolean };

export const forest = {
  title: "2026년 3월 숲",
  childName: "서연",
  /** 이번 달 한 줄 */
  oneLine: "쓰기와 모으기가 함께 자랐습니다",
  /** 스크롤 없이 보여야 한다 (AC-1.4) — 별을 즉시 소진하는 아이에게 유일한 누적 증거다 */
  starsEarned: 46,
  /** 첫 달이면 0으로 그리지 않는다 (ACE-1.2) */
  noPrevMonth: false,
  noPrevNotice: { title: "다음 달부터 비교할 수 있어요", body: "이번 달이 첫 기준이 됩니다" },
  deltas: [
    { label: "사려다 멈춤", from: "2회", to: "5회", improved: true },
    { label: "가격 비교", from: "0회", to: "4회", improved: true },
    { label: "저축률", from: "12%", to: "32%", improved: true },
    { label: "벌기", from: "새싹", to: "나무", improved: true },
    { label: "잘 쓰기", from: "씨앗", to: "새싹", improved: true },
  ] as readonly Delta[],
};
