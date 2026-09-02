import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { backHome, enterFailed, guardianArea, guardianLink } from "./locked.fixture";

// 아동 모드에서 보호자 경로를 두드렸을 때(D5) · 초대 링크 실패(FR-002 · AC-002-2)
export const metadata = { title: "잠긴 화면 · 핀프렌즈" };

export default async function ChildLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  // 🔴 초대 실패는 「어른 화면」과 다른 일이다. 같은 말을 하면 아이가 뭘 해야 할지 모른다
  const failed = sp.reason ? enterFailed[sp.reason] ?? enterFailed.NOT_FOUND : null;
  const view = failed ?? guardianArea;

  return (
    <Screen title={view.title} back={{ href: "/child/home", label: "내 방" }}>
      <Card tone="grow">
        <p className="text-body leading-relaxed">
          {view.body.map((line) => <span key={line} className="block">{line}</span>)}
        </p>
      </Card>

      {/* 아이 탓으로 읽히지 않게 — 막혔다가 아니라 「여긴 어른 화면」이다 */}
      <Link href="/child/home"
            className="mt-3 block min-h-touch rounded-card bg-primary text-center text-body font-bold leading-[44px] text-white">
        {backHome}
      </Link>

      {/* 🔴 아이가 눌러서 오는 자리다. 「너는 못 들어와」가 아니라 「어른이 쓰는 자리」로 말한다.
          PIN 이 없는 집이면 `/unlock` 이 정하는 법을 안내한다 — 죽은 길로 끝나지 않는다 */}
      <Link href="/unlock"
            className="mt-2 block min-h-touch rounded-card border border-line bg-surface text-center text-sub leading-[44px] text-ink-soft">
        {guardianLink}
      </Link>

      {sp.from ? (
        <p className="mt-3 text-center text-cap text-ink-mute">
          {/* 🔴 실제 서비스에서는 안 보인다. 지금은 무엇이 막혔는지 확인하려고 남겨 둔다 */}
          막힌 경로 <code>{sp.from}</code>
        </p>
      ) : null}
    </Screen>
  );
}
