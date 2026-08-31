/** 아이 온보딩 계약 — 어긋남 대장 D13 */

/**
 * 🔴 단계 수를 여기 한 곳에만 둔다.
 *    화면(문구)과 로직(끝났는지 판정)이 서로 다른 숫자를 믿으면
 *    아이가 마지막 장을 보고도 「끝」이 안 되거나, 중간에 별을 받는다.
 */
export const TOUR_STEPS = 7;

/** 실제 값을 문장에 끼워 넣는 자리. 없으면 설명이 남의 이야기가 된다 */
export type TourLive = "stars" | "missions";

export type TourStep = {
  readonly emoji: string;
  readonly title: string;
  readonly lines: readonly string[];
  readonly live?: TourLive;
  /** 이 단계가 설명하는 실제 화면 — 끝나고 바로 가볼 수 있게 */
  readonly peek?: { href: string; label: string };
};

export type TourState = {
  /** 지금 보여줄 단계 (0-based) */
  readonly step: number;
  readonly finished: boolean;
  readonly skipped: boolean;
  /** 한 번이라도 봤는가 — 홈에서 다시 붙잡을지 판단한다 */
  readonly seen: boolean;
};
