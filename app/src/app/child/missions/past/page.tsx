import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getMissionBoard } from "@/modules/mission";
import { MissionRow } from "@/components/child/MissionRow";
import { consentRequired, noDevice, pastEmpty, sections } from "../missions.fixture";

/**
 * 지난 미션 — 🔴 **미션 화면에서 떼어냈다** (사용자 지적: 통장과 같은 이유).
 *
 * 미션 화면은 **오늘 할 것과 기다리는 것**을 보는 자리다. 끝난 것·거절된 것·
 * 만료된 것이 그 아래 줄줄이 붙으면, 쌓일수록 **오늘 할 것이 위로 밀려난다** —
 * 아이가 매일 여는 화면인데 매일 길어진다.
 *
 * 🔴 **지우지 않는다. 옮겼을 뿐이다.** 거절 사유도 만료 안내도 여기 그대로 있다 —
 *    「잘된 것만 남기기」는 기록이 아니다.
 */
export const metadata = { title: "지난 미션 · 핀프렌즈" };

export default async function ChildPastMissionsPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title={sections.settled} back={{ href: "/child/missions", label: "미션" }}>
        <Empty emoji="🎯" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const board = await getMissionBoard(access.childId);

  return (
    <Screen role="아이 화면" title={sections.settled} back={{ href: "/child/missions", label: "미션" }}>
      {board.settled.length === 0 ? (
        <Empty emoji="🎯" title={pastEmpty.title} body={pastEmpty.body} />
      ) : (
        <ul className="grid gap-1.5">
          {board.settled.map((m) => <MissionRow key={m.id} m={m} />)}
        </ul>
      )}
    </Screen>
  );
}
