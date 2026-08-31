import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";

// 아이 기기에서 열리지만 읽고 누르는 사람은 부모다 — 등록은 보호자 확인 행위다.
export default function JoinLayout({ children }: { children: ReactNode }) {
  return <ModeFrame mode="clean">{children}</ModeFrame>;
}
