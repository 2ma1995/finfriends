// PROTO-DATA: LRN-001 — 백엔드 완료 시 이 파일을 지우고 커리큘럼 조회로 대체한다
export type Topic = {
  readonly key: string; readonly icon: string; readonly label: string;
  readonly done: number; readonly total: number; readonly locked?: boolean;
};

// 학습만 채워도 나무는 자라지 않는다. 그 사실을 화면에 적는다 (REQ-FUNC-001).
export const topics: readonly Topic[] = [
  { key: "earn",  icon: "🌳", label: "벌기",    done: 3, total: 3 },
  { key: "spend", icon: "🌿", label: "잘 쓰기", done: 2, total: 3 },
  { key: "save",  icon: "🌱", label: "모으기",  done: 1, total: 3 },
  { key: "grow",  icon: "🌱", label: "불리기",  done: 0, total: 3, locked: true },
];

export const notice = "퀴즈만으로는 자라지 않습니다. 배운 걸 한 번 해봐야 나무가 자라요.";
