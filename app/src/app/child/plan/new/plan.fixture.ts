// PROTO-DATA: PLN-001 — 백엔드 완료 시 이 파일을 지우고 계획 카드 CRUD 액션으로 대체한다

/** 「예산」·「한도」라고 부르지 않는다. 계획 카드다 (용어 고정 · 명세 §2.4) */
export const draft = {
  where: "다이소 성수점",
  topic: { icon: "🖊", label: "문구" },
  amount: 5000,
  writtenBy: "아이" as "아이" | "보호자",
};

export const topics = [
  { icon: "🖊", label: "문구" },
  { icon: "🍬", label: "간식·음료" },
  { icon: "📚", label: "도서" },
  { icon: "🎁", label: "선물" },
];

export const notice = "가기 전에 적으면, 쓴 뒤에 맞춰볼 수 있어요.";
