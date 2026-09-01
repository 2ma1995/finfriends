import { redirect } from "next/navigation";
import { Screen, Empty } from "@/components/shared/Screen";
import { listNotifications, markAllRead } from "@/modules/mission";
import { currentGuardian } from "@/lib/session/guardian-session";
import Link from "next/link";
import { countSubscriptions } from "@/lib/push";
import { empty, pushNotice, readNotice, title } from "./alerts.fixture";

/**
 * 보호자 알림함 — 어긋남 대장 D51.
 *
 * 🔴 **읽음을 화면을 열 때 찍는다.** 줄마다 「읽음」 버튼을 두면 아무도 안 누르고
 *    배지가 영영 안 사라진다. 목록을 봤다는 것이 읽었다는 뜻이다.
 *
 * 🔴 읽기 화면인데 쓰기가 있다. 그래도 여기가 맞다 —
 *    「봤다」를 아는 유일한 시점이 이 화면을 여는 순간이다.
 */
export const metadata = { title: "알림 · 핀프렌즈" };

export default async function ParentAlertsPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const list = await listNotifications(guardian.guardianId);
  // 🔴 이 보호자가 푸시를 받는 기기가 있나. 없으면 화면이 「앱 안에서만」이라고 말해야 한다
  const pushOn = (await countSubscriptions(guardian.guardianId)) > 0;
  // 🔴 목록을 읽은 **뒤에** 찍는다. 먼저 찍으면 이번 화면에서 새 알림 표시가 사라진다
  await markAllRead(guardian.guardianId);

  return (
    <Screen role="부모 화면" title={title} back={{ href: "/parent/tree", label: "성장 나무" }}>
      {list.length === 0 ? (
        <Empty emoji={empty.emoji} title={empty.title} body={empty.body} hint={empty.hint} />
      ) : (
        <ul className="grid gap-1.5">
          {list.map((n) => (
            <li
              key={n.id}
              className={`rounded-card border px-3 py-2.5 ${
                n.unread ? "border-primary-l bg-primary-bg" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-sub">{n.title}</b>
                <span className="shrink-0 text-cap text-ink-mute">{n.whenLabel}</span>
              </div>
              <p className="mt-0.5 text-sub leading-relaxed text-ink-soft">{n.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* 🔴 켠 부모와 안 켠 부모에게 다른 문구를 보인다 (D56).
          하나로 두면 반드시 한쪽에 거짓이 된다 — 전에는 「폰으로는 안 갑니다」로 못박혀 있었다 */}
      <p className="mt-3 text-cap leading-relaxed text-ink-mute">
        {pushOn ? (
          pushNotice.on
        ) : (
          <>
            {pushNotice.off}{" "}
            <Link href="/parent/mypage" className="underline decoration-line-2">
              켜러 가기
            </Link>
          </>
        )}
      </p>
      <p className="mt-1 text-cap leading-relaxed text-ink-mute">{readNotice}</p>
    </Screen>
  );
}
