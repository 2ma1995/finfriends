"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * 튜토리얼로 돌아가는 줄 — 🔴 **보러 갔다가 길을 잃던 것을 막는다.**
 *
 * 튜토리얼의 「미션 보기 →」를 누르면 진짜 미션 화면으로 나간다. 그런데 거기엔
 * **돌아올 길이 없었다** — 미션 화면은 뒤로가기가 아예 없고, 다른 화면은
 * 「내 방」뿐인데 내 방은 튜토리얼이 안 끝났으면 **다시 튜토리얼로 튕긴다.**
 * 아이가 길을 찾은 게 아니라 밀려서 돌아온 것이고, 몇 단계였는지도 잃는다.
 *
 * 🔴 **여섯 화면을 각각 고치지 않는다.** 레이아웃 한 곳에 두면 지금 여섯 개든
 *    나중에 열 개든 다 덮는다 — 화면마다 붙이면 새 화면에서 반드시 빠뜨린다.
 *
 * 🔴 **`?tour=` 가 있을 때만 뜬다.** 평소에 이 줄이 있으면 아이는 늘 튜토리얼
 *    중인 줄 안다.
 */
export function TourReturn({ label }: { label: string }) {
  const path = usePathname();
  const step = useSearchParams().get("tour");
  if (step === null || path.startsWith("/child/welcome")) return null;

  const n = Number(step);
  if (!Number.isInteger(n) || n < 0) return null;

  return (
    <Link href={`/child/welcome?step=${n}`}
          className="sticky top-0 z-30 flex min-h-touch items-center justify-center gap-1 border-b border-primary-l bg-primary-bg text-sub font-bold text-primary-d">
      ← {label}
    </Link>
  );
}
