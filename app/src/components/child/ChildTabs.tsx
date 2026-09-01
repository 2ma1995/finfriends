"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 아이 화면 하단 탭 — UX-003.
 *
 * 🔴 **아이는 뒤로 가기를 잘 쓰지 않는다.** 홈의 「오늘 할 일」 목록만 있으면
 *    한 화면 들어간 뒤 돌아오지 못하고 그 자리에서 앱을 닫는다.
 *
 * 🔴 **아동 세션은 `parent/**` 로 가는 길을 갖지 않는다** — 계정 분리 · 부모→아이 단방향.
 *    여기 다섯 개 모두 `/child/**` 다.
 *
 * 🔴 **상점은 여기 없다.** 상점은 「내 방」에서 들어간다 — 방을 보고 나서 사는 것이지,
 *    어디서든 살 수 있는 자리에 두면 사는 것 자체가 목적이 된다.
 *    대신 **통장**을 넣었다. 별과 돈은 늘 볼 수 있어야 한다.
 */

/**
 * 🔴 **「내 별」은 여기 없다.** 「내 방」 맨 위 ⭐ 를 누르면 간다 (`MoneyHUD`) —
 *    두 자리에 두면 탭이 다섯이 되고, 아이가 매일 고르는 것은 그중 넷뿐이다.
 *    별은 **보는 것**이지 **하는 것**이 아니라서, 할 일 목록에 낄 자리가 아니다.
 */
const TABS = [
  { href: "/child/home",     emoji: "🏠", label: "내 방" },
  { href: "/child/missions", emoji: "🎯", label: "미션" },
  { href: "/child/learn",    emoji: "📚", label: "배우기" },
  { href: "/child/allowance", emoji: "💰", label: "내 통장" },
] as const;

/**
 * 🔴 탭 높이는 **터치 하한(44px)이 아니라 그보다 넉넉히** 잡는다.
 *    아이 손가락은 어른보다 조준이 나쁘고, 화면 맨 아래는 잡은 손에 가려진다.
 */

/** 🔴 여기서는 탭을 감춘다 — 튜토리얼은 순서대로 봐야 하고, 잠금은 갈 곳이 없다 */
const HIDDEN = ["/child/welcome", "/child/locked"];

export function ChildTabs({ todoCount = 0 }: { todoCount?: number }) {
  const path = usePathname();
  if (HIDDEN.some((h) => path.startsWith(h))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-frame border-t border-line bg-surface/95 backdrop-blur">
      {/* 🔴 **칸 수를 문자열로 만들지 않는다.** `grid-cols-${TABS.length}` 로 쓰면
             Tailwind 가 그 클래스를 못 찾아 CSS 를 아예 안 만든다 — 탭이 세로로 쌓인다 */}
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          // /child/home 은 정확히 일치할 때만. 나머지는 하위 경로도 같은 탭이다
          const on = t.href === "/child/home" ? path === t.href : path.startsWith(t.href);
          const badge = t.href === "/child/missions" && todoCount > 0;

          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined}
                    className={`relative grid min-h-[68px] place-items-center gap-1 py-3 ${
                      on ? "text-primary-d" : "text-ink-mute"}`}>
                <span className="text-[1.6em] leading-none">{t.emoji}</span>
                <span className={`text-cap leading-none ${on ? "font-bold" : ""}`}>{t.label}</span>
                {/* 할 게 남았다는 표시 — 숫자를 크게 쓰지 않는다. 재촉이 아니라 안내다 */}
                {badge ? (
                  <span className="absolute right-[20%] top-2 grid h-4 min-w-4 place-items-center rounded-full bg-star px-1 text-micro font-bold tabular-nums text-ink">
                    {todoCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* 홈 인디케이터 있는 기기에서 탭이 가리지 않게 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
