import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";

// 계정 만들기는 보호자가 읽는 화면이다 — 아동은 자체 자격증명을 갖지 않는다(CON-001).
export default function SignupLayout({ children }: { children: ReactNode }) {
  return <ModeFrame mode="clean">{children}</ModeFrame>;
}
