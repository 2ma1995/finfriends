import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getClosed } from "@/modules/savings";
import { consentRequired, noDevice, savings } from "../allowance.fixture";

/**
 * 지난 저금 — 🔴 **통장에서 떼어냈다** (사용자 지적).
 *
 * 통장에는 **지금 하고 있는 저금 하나**만 남는다. 끝난 것·깬 것·거절된 것이
 * 그 아래 줄줄이 붙으면, 아이는 **지금 뭘 하고 있는지**를 못 찾는다.
 *
 * 🔴 **깬 것도 지우지 않는다.** 「다 모았어요」만 남기면 기록이 아니라 자랑이 된다 —
 *    깬 것을 보는 것도 배우는 일이다.
 */
export const metadata = { title: "지난 저금 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildClosedSavingsPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={savings.pastTitle} back={{ href: "/child/allowance", label: "내 통장" }}>
        <Empty emoji="🐖" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  // 🔴 통장은 3건만 보여줬다. 여기는 **전부** 본다 — 떼어낸 이유가 그거다
  const closed = await getClosed(access.childId, 50);

  return (
    <Screen role="아이 화면" title={savings.pastTitle} back={{ href: "/child/allowance", label: "내 통장" }}>
      {closed.length === 0 ? (
        <Empty emoji="🐖" title={savings.pastEmpty.title} body={savings.pastEmpty.body} />
      ) : (
        <ul className="grid gap-1">
          {closed.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
              <span className="flex-1 text-sub">{c.goal}</span>
              <span className="text-cap text-ink-mute">
                {c.state === "DONE" ? savings.doneBadge
                 : c.state === "BROKEN" ? savings.brokenBadge : savings.rejectedBadge}
              </span>
              <b className="shrink-0 tabular-nums text-sub">{won(c.amount)}</b>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
