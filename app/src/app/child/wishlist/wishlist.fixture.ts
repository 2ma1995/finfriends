// PROTO-DATA: PRC-004 — 백엔드 완료 시 이 파일을 지우고 위시리스트 조회·단계 보상 판정으로 대체한다
export type Wish = {
  readonly id: string; readonly emoji: string; readonly name: string;
  readonly price: number; readonly saved: number; readonly rank: 1 | 2 | 3;
};

/** 30 · 70 · 100% 에서 단계 보상이 붙는다 (PRC-004) */
export const MILESTONES = [30, 70, 100] as const;
/** 순위 변경은 월 1회 */
export const rankChangeLeft = 1;

export const wishes: readonly Wish[] = [
  { id: "w-1", emoji: "🎨", name: "물감 세트", price: 24000, saved: 18000, rank: 1 },
  { id: "w-2", emoji: "📕", name: "만화책",   price: 12000, saved: 4000,  rank: 2 },
  { id: "w-3", emoji: "⚽", name: "축구공",   price: 30000, saved: 3000,  rank: 3 },
];
