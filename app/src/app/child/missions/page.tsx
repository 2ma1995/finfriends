import Link from "next/link";
import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getMissionBoard } from "@/modules/mission";
import { MissionRow } from "@/components/child/MissionRow";
import {
  consentRequired, empty, intro, noDevice, pastLink, photoResult, sections,
} from "./missions.fixture";

// PRC-001 — 미션. 🔴 아이가 하는 일은 「했어요」 하나뿐이다. 승인은 보호자가 한다
export const metadata = { title: "미션 · 핀프렌즈" };

export default async function ChildMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen title="미션" back={{ href: "/child/home", label: "내 방" }}>
        <Empty emoji="🎯" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const [board, sp] = await Promise.all([getMissionBoard(access.childId), searchParams]);
  const photoMsg = sp.photo ? photoResult[sp.photo] ?? photoResult.NOT_FOUND : null;
  const nothing = board.todo.length + board.waiting.length + board.settled.length === 0;

  return (
    <Screen title="미션" back={{ href: "/child/home", label: "내 방" }}>
      {/* 🔴 사진이 올라갔는지 · 왜 안 됐는지 **말해 준다.** 조용히 넘기면 또 올린다 */}
      {photoMsg ? (
        <p className={`mb-2 rounded-card border px-3 py-2 text-center text-sub font-bold ${
          sp.photo === "ok" ? "border-primary-l bg-primary-bg text-primary-d"
                            : "border-miss-line bg-miss-bg text-miss"}`}>
          {photoMsg}
        </p>
      ) : null}

      {/* 🔴 **미션과 실천이 아이 눈에 똑같다.** 이 화면이 무엇인지 먼저 말한다 */}
      <p className="mb-2 text-sub leading-relaxed text-ink-mute">{intro}</p>

      {nothing ? <Empty emoji="🎯" {...empty} /> : null}

      {board.todo.length > 0 ? (
        <>
          <h2 className="mb-2 text-title font-bold leading-none">{sections.todo}</h2>
          <ul className="grid gap-1.5">{board.todo.map((m) => <MissionRow key={m.id} m={m} action="done" />)}</ul>
        </>
      ) : null}

      {board.waiting.length > 0 ? (
        <>
          <h2 className="mb-2 mt-7 text-title font-bold leading-none">{sections.waiting}</h2>
          <ul className="grid gap-1.5">{board.waiting.map((m) => <MissionRow key={m.id} m={m} action="undo" />)}</ul>
        </>
      ) : null}

      {/* 🔴 **지난 것은 딴 화면이다.** 여기 쌓이면 오늘 할 것이 매일 아래로 밀린다 */}
      {board.settled.length > 0 ? (
        <Link href="/child/missions/past"
              className="mt-7 flex min-h-touch items-center gap-2.5 rounded-card bg-surface px-3.5">
          <span className="text-[1.1em]">🗂</span>
          <span className="flex-1 text-sub font-bold">{pastLink}</span>
          <span className="text-cap tabular-nums text-ink-mute">{board.settled.length}건 ›</span>
        </Link>
      ) : null}
    </Screen>
  );
}
