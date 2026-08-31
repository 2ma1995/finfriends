import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";

// 동의 게이트는 보호자가 읽는 화면이다 — 법정대리인 동의(CON-002).
export default function ConsentLayout({ children }: { children: ReactNode }) {
  return <ModeFrame mode="clean">{children}</ModeFrame>;
}
