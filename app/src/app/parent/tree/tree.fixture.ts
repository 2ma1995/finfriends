// PROTO-DATA: GRW-003 — 백엔드 완료 시 이 파일을 지우고 GRW-001(나무 상태) · GRW-002(정체 판정) 호출로 대체한다

// 타입을 src/contracts 에 선취하지 않는다 — 그 파일은 CTR-002 소유다.
// 화면 로컬로 두고 CTR-002 완료 시 import 만 갈아끼운다.
export type Stage = 0 | 1 | 2;
export const STAGE_LABEL: Record<Stage, string> = { 0: "씨앗", 1: "새싹", 2: "나무" };

export type Condition = { readonly label: string; readonly current: number; readonly required: number };

export type Tree = {
  readonly id: "earn" | "spend" | "save" | "grow";
  readonly label: "벌기" | "잘 쓰기" | "모으기" | "불리기";
  readonly icon: string;
  readonly stage: Stage;
  readonly conditions: readonly Condition[];
  readonly cycleDays: number;
  /** 정체 14일 — 원인은 조건 단위로 전부 (ACE-3.1) */
  readonly stalledDays: number | null;
  readonly locked?: boolean;
};

// 각 영역은 독립된 나무다. 학습·퀴즈를 다 채워도 그 영역의 실천이 0이면 승급하지 않는다
// (REQ-FUNC-001 · 실천 없이는 자라지 않는다).
export const trees: readonly Tree[] = [
  { id: "earn",  label: "벌기",    icon: "🌳", stage: 2, cycleDays: 16, stalledDays: null,
    conditions: [{ label: "학습", current: 3, required: 3 }, { label: "퀴즈", current: 5, required: 5 }, { label: "미션 실천", current: 4, required: 4 }] },
  { id: "spend", label: "잘 쓰기", icon: "🌿", stage: 1, cycleDays: 16, stalledDays: 14,
    conditions: [{ label: "학습", current: 2, required: 2 }, { label: "퀴즈", current: 4, required: 4 }, { label: "계획 지키기", current: 2, required: 3 }] },
  { id: "save",  label: "모으기",  icon: "🌱", stage: 0, cycleDays: 8,  stalledDays: null,
    conditions: [{ label: "학습", current: 1, required: 3 }, { label: "퀴즈", current: 2, required: 5 }, { label: "용돈 저축", current: 1, required: 1 }] },
  { id: "grow",  label: "불리기",  icon: "🌱", stage: 0, cycleDays: 0,  stalledDays: null, locked: true,
    conditions: [{ label: "학습", current: 0, required: 3 }, { label: "퀴즈", current: 0, required: 5 }, { label: "실천", current: 0, required: 1 }] },
];

export const child = { name: "서연", cycleLabel: "3월 · 실시간" };

/** 실천 근거 — 펼치지 않아도 보인다 (AC-1.2) */
export const evidence = {
  title: "이번 달 달라진 것",
  lines: ["사려다 멈춘 일이 2회 → 5회로 늘었어요.", "「잘 쓰기」가 새싹까지 자랐습니다."],
};

/** 정체 안내 — 아이 탓으로 읽히면 안 된다 (AC-3.2 오귀인 ≤ 2/8) */
export const stallReassurance = {
  title: "이건 아이 문제가 아니에요",
  lines: ["조건 하나가 남았을 뿐입니다.", "계획 카드를 한 번 적으면 채워집니다."],
};

/** 승인 대기 — 1건 이상일 때만 노출 (AC-6.2) */
export const pendingCount = 3;
