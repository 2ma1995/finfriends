import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";

// Fun Mode — 아동 뷰.
// 아동 세션은 parent/** 로 가는 링크·버튼을 갖지 않는다 — 계정 분리 · 부모→아이 단방향.
export default function ChildLayout({ children }: { children: ReactNode }) {
  return <ModeFrame mode="fun">{children}</ModeFrame>;
}
