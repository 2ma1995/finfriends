import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";

// 로그인하는 사람은 보호자뿐이다 — 아동은 자체 자격증명을 갖지 않는다(CON-001).
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <ModeFrame mode="clean">{children}</ModeFrame>;
}
