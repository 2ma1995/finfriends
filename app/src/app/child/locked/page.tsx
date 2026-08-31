import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";

// 아동 모드에서 보호자 경로를 두드렸을 때 — 어긋남 대장 D5
export const metadata = { title: "잠긴 화면 · 핀프렌즈" };

export default async function ChildLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const from = (await searchParams).from ?? "";

  return (
    <Screen role="아이 화면" title="여긴 어른 화면이에요" back={{ href: "/child/home", label: "내 방" }}>
      <Card tone="grow">
        <p className="text-[0.9em] leading-relaxed">
          <span className="block">이 화면은 보호자가 여는 곳이에요.</span>
          <span className="block">부모님께 보여 달라고 해 보세요.</span>
        </p>
      </Card>

      {/* 아이 탓으로 읽히지 않게 — 막혔다가 아니라 「여긴 어른 화면」이다 (AC-3.2 와 같은 규율) */}
      <Link href="/child/home"
            className="mt-3 block min-h-touch rounded-card bg-primary text-center text-[0.9em] font-bold leading-[44px] text-white">
        내 방으로 돌아가기
      </Link>

      {from ? (
        <p className="mt-3 text-center text-[0.7em] text-ink-mute">
          {/* 🔴 실제 서비스에서는 안 보인다. 지금은 무엇이 막혔는지 확인하려고 남겨 둔다 */}
          막힌 경로 <code>{from}</code>
        </p>
      ) : null}
    </Screen>
  );
}
