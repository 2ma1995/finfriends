import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getPassbook } from "@/modules/allowance";
import {
  consentRequired, empty, historyTitle, inLabel, movedLabel, noDevice, notice, outLabel,
} from "../allowance.fixture";

/**
 * 들어오고 나간 돈 — 🔴 **통장에서 떼어냈다** (사용자 지적: 「한 공간에 다 나와서 복잡하다」).
 *
 * 통장 첫 화면은 **지금 얼마 있고 무엇을 향해 가는지**를 말하는 자리다.
 * 30줄짜리 지난 기록이 그 아래 붙으면 **스크롤이 기록으로 끝난다** —
 * 목표(갖고 싶은 것)도, 저금도 그 밑에 묻힌다.
 *
 * 🔴 **기록을 줄이지 않았다.** 자리를 옮겼을 뿐이다 — 용돈기입장에서 기록을
 *    잘라내면 그건 기입장이 아니다.
 */
export const metadata = { title: "들어오고 나간 돈 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ChildHistoryPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={historyTitle} back={{ href: "/child/allowance", label: "내 통장" }}>
        <Empty emoji="📒" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const p = await getPassbook(access.childId, access.guardianId);

  return (
    <Screen role="아이 화면" title={historyTitle} back={{ href: "/child/allowance", label: "내 통장" }}>
      {p.history.length === 0 ? <Empty emoji="📒" {...empty} /> : (
        <ul className="grid gap-1">
          {p.history.map((h) => (
            <li key={h.id}
                className={`flex items-center gap-2 rounded-card border px-3 py-2 ${
                  h.code === "ADJUST" ? "border-star bg-star-bg" : "border-line bg-surface"}`}>
              <span className="flex-1">
                <b className="block text-[0.84em]">{h.memo}</b>
                <span className="text-[0.7em] text-ink-mute">
                  {h.whenLabel} · {movedLabel[h.code] ?? (h.delta > 0 ? inLabel : outLabel)}
                </span>
              </span>
              <b className={`shrink-0 tabular-nums text-[0.86em] ${
                h.delta > 0 ? "text-primary-d" : "text-ink-soft"}`}>
                {h.delta > 0 ? "+" : ""}{won(h.delta)}
              </b>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2.5">
        <p className="text-[0.82em] leading-relaxed">{notice}</p>
      </div>
    </Screen>
  );
}
