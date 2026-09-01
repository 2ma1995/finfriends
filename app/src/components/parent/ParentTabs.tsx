"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, PiggyBank, TreePine, Trees, UserRound } from "lucide-react";

/**
 * 부모 화면 하단 네비게이션 — 어긋남 대장 D14.
 *
 * 🔴 **2차 아트보드에는 부모 화면에 탭바가 없었다.** 하단 탭은 아이 화면(`Main.dc.html`)에만
 *    있었고, 부모는 성장 나무를 허브로 두는 구조였다. 사용자 결정으로 GNB 로 바꿨다.
 *
 * 바꾼 이유 — 허브 구조가 실제로 성립하지 않았다. 성장 나무에서 **월간 숲과 소비 내역으로
 * 가는 링크가 아예 없어** 주소를 직접 치지 않으면 부모 화면 넷 중 둘에 도달할 수 없었다.
 *
 * 대가 — US-1 AC3 이 「확인 시간 중위 ≤3분」을 요구한다. 탭이 4개면 둘러보게 되므로
 * 이 지표를 실측할 때 탭바가 원인인지 함께 본다.
 *
 * 왜 클라이언트 컴포넌트인가 — 지금 어느 탭인지는 경로로만 알 수 있고
 * `usePathname` 은 클라이언트에서만 돈다. 데이터를 읽지 않으므로 서버 경계와 무관하다.
 */

const TABS = [
  { href: "/parent/tree", label: "나무", Icon: TreePine },
  { href: "/parent/forest", label: "숲", Icon: Trees },
  // SRS §3 — 「아이 통장(보호자용)」이 충전 · 미션 관리 · 이자율 설정을 갖는다.
  // 미션은 이 안의 하위 화면이므로 `/parent/bank/missions` 에서도 이 탭이 켜진다
  { href: "/parent/bank", label: "통장", Icon: PiggyBank },
  { href: "/parent/spending", label: "소비", Icon: CreditCard },
  // 계정·기기·카드·로그아웃이 갈 자리. 전에는 로그아웃이 모든 화면 하단에 떠 있었다
  { href: "/parent/mypage", label: "내 정보", Icon: UserRound },
] as const;

/** 하위 화면에서도 그 줄기의 탭이 켜져 있어야 지금 어디인지 알 수 있다 */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParentTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="부모 화면"
      /**
       * 🔴 **아이 GNB(`ChildTabs`)와 같은 크기다** (사용자 요청).
       *    한 기기에서 부모와 아이가 번갈아 쓰는데 탭 높이가 다르면
       *    **손가락이 기억한 자리가 어긋난다.**
       *
       *    `sticky` 를 유지한다 — 아이 쪽은 `fixed` 라 본문에 `pb-[92px]` 를 비워 줘야 하고,
       *    이쪽은 `flex` 열 + `mt-auto` 로 자리를 차지하므로 본문을 건드릴 필요가 없다.
       *    **높이만 맞추면 되고 배치 방식을 바꿀 이유는 없다.**
       */
      className="sticky bottom-0 mt-auto border-t border-line bg-surface/95 backdrop-blur"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                /* 🔴 `min-h-[68px]` · `py-3` · `gap-1` — 아이 GNB 와 같은 값이다 */
                className={`grid min-h-[68px] place-items-center gap-1 py-3 text-[0.7em] ${
                  active ? "font-bold text-primary-d" : "text-ink-mute"
                }`}
              >
                {/*
                  🔴 아이 쪽은 이모지(`text-[1.6em]`)지만 여기는 **선 아이콘**이다.
                     `clean` 모드에 이모지를 쓰면 부모 화면이 아이 화면처럼 읽힌다.
                     **높이만 맞추고 그림 종류는 각 모드 것을 쓴다.**
                */}
                <Icon
                  size={24}
                  strokeWidth={active ? 2.2 : 1.7}
                  aria-hidden
                  className={active ? "text-primary" : "text-ink-mute"}
                />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* 🔴 홈 인디케이터에 탭이 가리지 않게. 아이 GNB 와 같다 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
