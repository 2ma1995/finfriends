// PROTO-DATA: PRC-001 · PRC-003 — 백엔드 완료 시 이 파일을 지우고 미션 승인 액션 호출로 대체한다
export type Pending = {
  readonly id: string;
  readonly title: string;
  readonly topic: "벌기" | "잘 쓰기" | "모으기";
  readonly doneAt: string;
  readonly reward: number;
};

/** 5건 이상이면 일괄 승인이 열린다 (PRC-003) */
export const BULK_THRESHOLD = 5;

export const pendings: readonly Pending[] = [
  { id: "m-31", title: "장 볼 때 가격 두 개 비교하기", topic: "잘 쓰기", doneAt: "어제", reward: 2 },
  { id: "m-30", title: "빈 병 분리배출 돕기",         topic: "벌기",    doneAt: "2일 전", reward: 1 },
  { id: "m-28", title: "용돈 1,000원 저금통에 넣기",  topic: "모으기",  doneAt: "3일 전", reward: 1 },
];

/** 소급 지급 — 승인하면 한 날짜 기준으로 반영된다 (PRC-002) */
export const retroNotice = {
  title: "아직 반영되지 않았어요",
  body: "아이는 이미 했습니다. 승인하면 한 날짜 기준으로 소급해서 반영됩니다",
};
