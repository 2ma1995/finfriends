import type { ReactNode } from "react";
import { ModeFrame } from "@/components/shared/ModeFrame";
import { ParentTabs } from "@/components/parent/ParentTabs";
import { AlertBell } from "@/components/parent/AlertBell";
import { currentGuardian } from "@/lib/session/guardian-session";
import { countUnread } from "@/modules/mission";
import { alertsLabel, noAlertsLabel } from "@/app/parent/tree/tree.fixture";

/**
 * Clean Mode — 보호자 뷰. 증거를 제시하고 판단을 돕는다.
 *
 * 하단 탭이 화면 끝에 붙어야 하므로 프레임을 flex 열로 세운다 —
 * 내용이 짧아도 탭이 위로 딸려 올라오지 않는다 (`mt-auto` · `sticky bottom-0`).
 *
 * 로그아웃은 여기 없다. 「내 정보」 탭으로 옮겼다 — 모든 화면 하단에 두면
 * 자주 쓰지 않는 것이 탭과 자리를 다툰다.
 */
export default async function ParentLayout({ children }: { children: ReactNode }) {
  /**
   * 🔴 **여기서 센다.** 화면마다 세면 새 화면에서 빠뜨린다 (`D63` 에서 겪었다 —
   *    안 읽은 알림이 성장 나무에서만 보였다).
   *
   * 🔴 로그인 전에는 벨을 안 그린다. 각 화면이 알아서 로그인으로 보낸다 —
   *    여기서 막으면 그 판단이 두 곳이 된다.
   */
  const guardian = await currentGuardian();
  const unread = guardian ? await countUnread(guardian.guardianId) : 0;
  return (
    <ModeFrame mode="clean">
      <div className="flex min-h-dvh flex-col">
        {guardian ? (
          <AlertBell unread={unread} label={unread > 0 ? alertsLabel(unread) : noAlertsLabel} />
        ) : null}
        <div className="flex-1">
          {children}
        </div>
        <ParentTabs />
      </div>
    </ModeFrame>
  );
}
