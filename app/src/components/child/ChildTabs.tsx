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
 */

const TABS = [
  { href: "/child/home",     emoji: "🏠", label: "내 방" },
  { href: "/child/missions", emoji: "🎯", label: "미션" },
  { href: "/child/learn",    emoji: "📚", label: "배우기" },
  { href: "/child/stars",    emoji: "⭐", label: "내 별" },
  { href: "/child/shop",     emoji: "🛍", label: "상점" },
] as const;

/** 🔴 여기서는 탭을 감춘다 — 튜토리얼은 순서대로 봐야 하고, 잠금은 갈 곳이 없다 */
const HIDDEN = ["/child/welcome", "/child/locked"];

export function ChildTabs({ todoCount = 0 }: { todoCount?: number }) {
  const path = usePathname();
  if (HIDDEN.some((h) => path.startsWith(h))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-frame border-t border-line bg-surface/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          // /child/home 은 정확히 일치할 때만. 나머지는 하위 경로도 같은 탭이다
          const on = t.href === "/child/home" ? path === t.href : path.startsWith(t.href);
          const badge = t.href === "/child/missions" && todoCount > 0;

          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined}
                    className={`relative grid min-h-touch place-items-center gap-0.5 py-1.5 ${
                      on ? "text-primary-d" : "text-ink-mute"}`}>
                <span className="text-[1.25em] leading-none">{t.emoji}</span>
                <span className={`text-[0.62em] ${on ? "font-bold" : ""}`}>{t.label}</span>
                {/* 할 게 남았다는 표시 — 숫자를 크게 쓰지 않는다. 재촉이 아니라 안내다 */}
                {badge ? (
                  <span className="absolute right-[22%] top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-star px-1 text-[0.5em] font-bold tabular-nums text-ink">
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
