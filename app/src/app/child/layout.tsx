import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";
import { Suspense } from "react";
import { ChildTabs } from "@/components/child/ChildTabs";
import { TourReturn } from "@/components/child/TourReturn";
import { tourReturnLabel } from "@/app/child/welcome/welcome.fixture";
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
      {/*
        🔴 **부모 화면(나무)과 같은 방식으로 맞췄다** (사용자 지적 — PWA 에서 아이 화면만
           하단 탭 위치가 어긋났다).

           예전엔 탭이 `fixed` 라 본문에 `pb-[92px]` 로 자리를 **손으로 비워** 뒀다.
           그 숫자가 틀렸다 — 탭은 `min-h-[68px]` + 테두리 + **안전영역**이라,
           홈 인디케이터가 있는 기기(34px)에서는 103px 가 필요한데 92px 만 비어서
           **내용 아래가 탭에 가렸다.** 기기마다 값이 다르니 손으로 맞출 수가 없다.

           이제 탭이 흐름 안에서 자기 자리를 차지한다 — 비워 줄 필요가 없고,
           어떤 기기에서도 어긋나지 않는다.
      */}
      <div className="flex min-h-dvh flex-col">
        {/* 🔴 튜토리얼에서 보러 나왔으면 돌아갈 줄을 맨 위에 둔다 —
               화면마다 붙이면 새 화면에서 반드시 빠뜨린다.
            🔴 **열 안에 둔다.** 밖에 두면 이 줄 높이만큼 화면이 100dvh 를 넘겨
               내용이 짧은데도 스크롤이 생긴다 */}
        <Suspense fallback={null}><TourReturn label={tourReturnLabel} /></Suspense>
        <div className="flex-1">{children}</div>
        <ChildTabs todoCount={todoCount} />
      </div>
    </ModeFrame>
  );
}
