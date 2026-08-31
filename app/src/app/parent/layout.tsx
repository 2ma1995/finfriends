import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";
import { SignOutBar } from "@/components/parent/SignOutBar";
import { ParentTabs } from "@/components/parent/ParentTabs";

/**
 * Clean Mode — 보호자 뷰. 증거를 제시하고 판단을 돕는다.
 *
 * 하단 탭이 화면 끝에 붙어야 하므로 프레임을 flex 열로 세운다 —
 * 내용이 짧아도 탭이 위로 딸려 올라오지 않는다 (`mt-auto` · `sticky bottom-0`).
 */
export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <ModeFrame mode="clean">
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">
          {children}
          <SignOutBar />
        </div>
        <ParentTabs />
      </div>
    </ModeFrame>
  );
}
