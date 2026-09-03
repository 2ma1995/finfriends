import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * 알림 벨 — 어긋남 대장 D75.
 *
 * 🔴 **레이아웃에 둔다. 화면마다 붙이지 않는다.** 화면마다 붙이면
 *    **새 화면에서 반드시 빠뜨린다** — 아이 화면의 「돌아가기」 줄에서 이미 그렇게 정했다.
 *    한동안 안 읽은 알림을 **성장 나무 화면에서만** 볼 수 있었다(`D63`).
 *    통장·소비·숲에 있는 부모는 알림이 온 줄 몰랐다.
 *
 * 🔴 **위에 붙여 둔다**(`sticky top-0`). 스크롤로 밀려 올라가면
 *    긴 화면 아래쪽에 있는 부모가 못 본다. 아래 탭이 `sticky bottom-0` 인 것과 짝이다.
 *
 * 🔴 **0이면 숫자를 안 그린다.** 빈 배지를 늘 띄우면 아무도 안 본다 —
 *    벨은 남기되 「지금 볼 것이 있다」는 신호만 뺀다.
 *
 * 🔴 **숫자는 화면을 열 때의 값이다.** 서버에서 세어 그린 것이라
 *    보고 있는 동안 새 알림이 와도 저절로 바뀌지 않는다.
 *    폰 잠금화면 알림은 그 사이에도 간다(`D56`) — 그쪽이 실시간 통로다.
 */
export function AlertBell({ unread, label }: { unread: number; label: string }) {
  return (
    <div className="sticky top-0 z-20 flex justify-end bg-canvas/95 px-gap pt-2 backdrop-blur">
      <Link
        href="/parent/alerts"
        aria-label={label}
        className="relative grid size-11 place-items-center rounded-card"
      >
        <Bell size={22} className={unread > 0 ? "text-primary" : "text-ink-mute"} aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-miss px-1 text-micro font-bold leading-[18px] text-white"
            /* 🔴 숫자는 그림이 아니라 값이다 — 읽는 사람에게는 위 `aria-label` 이 말한다 */
            aria-hidden
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
