import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";

// Clean Mode — 보호자 뷰. 증거를 제시하고 판단을 돕는다.
export default function ParentLayout({ children }: { children: ReactNode }) {
  return <ModeFrame mode="clean">{children}</ModeFrame>;
}
