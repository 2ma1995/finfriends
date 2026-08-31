// PROTO-DATA: PLN-005 — 백엔드 완료 시 이 파일을 지우고 소비 내역 집계 조회로 대체한다
export type Line = { readonly icon: string; readonly label: string; readonly amount: number; readonly planned: boolean };

export const notice = "계획에 없던 업종을 표시하는 것이지, 잘못을 표시하는 것이 아닙니다.";

export const spending = {
  monthLabel: "3월",
  /** 전월 대비 증감액이 상단이다 (PLN-005) */
  total: 47500,
  prevTotal: 61000,
  byTopic: [
    { icon: "🖊", label: "문구",      amount: 18000, planned: true },
    { icon: "🍬", label: "간식·음료", amount: 15500, planned: false },
    { icon: "📚", label: "도서",      amount: 9000,  planned: true },
    { icon: "🎁", label: "선물",      amount: 5000,  planned: true },
  ] as readonly Line[],
};
