import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";
import { ChildTabs } from "@/components/child/ChildTabs";
import { currentChild } from "@/lib/session/current-child";
import { getMissionBoard } from "@/modules/mission";

// Fun Mode — 아동 뷰.
// 아동 세션은 parent/** 로 가는 링크·버튼을 갖지 않는다 — 계정 분리 · 부모→아이 단방향.
export default async function ChildLayout({ children }: { children: ReactNode }) {
  // 탭의 「할 게 남음」 표시. 기기가 안 열렸으면 조회하지 않는다
  const access = await currentChild();
  const todoCount = access.ok ? (await getMissionBoard(access.childId)).todo.length : 0;

  return (
    <ModeFrame mode="fun">
      {/* 하단 탭이 내용을 가리지 않게 자리를 비운다 */}
      <div className="pb-[72px]">{children}</div>
      <ChildTabs todoCount={todoCount} />
    </ModeFrame>
  );
}
