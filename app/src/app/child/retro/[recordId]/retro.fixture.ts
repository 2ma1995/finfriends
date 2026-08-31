// PROTO-DATA: PLN-003 — 백엔드 완료 시 이 파일을 지우고 PLN-002(결제 매칭) · PLN-003(회고 문장 추출)으로 대체한다
export type Line = { readonly icon: string; readonly label: string; readonly amount: number; readonly unplanned?: boolean };
export type Retro = {
  readonly whenLabel: string;
  readonly planned: readonly Line[];
  readonly actual: readonly Line[];
  /** 금액 단독으로 판정한다 (ADR-008) */
  readonly match: "MET" | "EXCEEDED";
  /** 넘김에도 문장은 똑같이 제시한다. 갈리는 건 별뿐이다 */
  readonly retroLines: readonly string[];
  /** 넘김은 미지급이되 차감하지 않는다 (P-03) */
  readonly starLabel: string;
};

const BY_ID: Record<string, Retro> = {
  "r-201": {
    whenLabel: "어제 · 다이소 성수점",
    planned: [{ icon: "🖊", label: "문구", amount: 5000 }],
    actual: [{ icon: "🖊", label: "문구", amount: 3000 }],
    match: "MET",
    retroLines: ["적은 대로 잘 썼어요.", "지우개랑 스티커, 계획한 만큼만 샀네요."],
    starLabel: "⭐ 1개를 받았어요",
  },
  "r-202": {
    whenLabel: "어제 · 다이소 성수점",
    planned: [{ icon: "🖊", label: "문구", amount: 5000 }],
    actual: [
      { icon: "🖊", label: "문구", amount: 3000 },
      { icon: "🍬", label: "간식·음료", amount: 3000, unplanned: true },
    ],
    match: "EXCEEDED",
    retroLines: ["계획보다 3,000원 더 썼어요.", "젤리와 음료는 적어두지 않았던 가게예요."],
    starLabel: "⭐ 없음 · 가진 별은 그대로예요",
  },
};

export function getRetro(id: string): Retro { return BY_ID[id] ?? BY_ID["r-201"]; }
export const RECORD_IDS = Object.keys(BY_ID);
