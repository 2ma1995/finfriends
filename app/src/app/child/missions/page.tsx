import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getMissionBoard } from "@/modules/mission";
import type { MissionView } from "@/contracts/mission";
import { markMissionDone, undoMissionDone } from "@/app/actions/mission";
import {
  backfilledNotice, consentRequired, doneLabel, empty, noDevice, photoLabel, photoNotice,
  rejectedPrefix, sections, undoLabel, waitingNotice,
} from "./missions.fixture";

// PRC-001 — 미션. 🔴 아이가 하는 일은 「했어요」 하나뿐이다. 승인은 보호자가 한다
export const metadata = { title: "미션 · 핀프렌즈" };

function Row({ m, action }: { m: MissionView; action?: "done" | "undo" }) {
  const tone =
    m.bucket === "WAITING" ? "border-star bg-star-bg"
    : m.bucket === "REJECTED" ? "border-miss-line bg-miss-bg"
    : m.bucket === "DONE" ? "border-primary-l/50 bg-primary-bg"
    : "border-line bg-surface";

  return (
    <li className={`rounded-card border p-3 ${tone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <b className="text-[0.9em]">{m.icon} {m.title}</b>
        <span className="shrink-0 text-[0.78em]">
          {/* 🔴 금액이 걸린 미션은 **용돈이 생긴다.** 별만 보이면 「벌기」가 안 보인다 */}
          {m.payoutWon > 0 ? (
            <b className="text-primary-d">{m.payoutWon.toLocaleString("ko-KR")}원</b>
          ) : null}
          <span className="text-star-d">{m.payoutWon > 0 ? " · " : ""}⭐ {m.reward}</span>
        </span>
      </div>
      <div className="mt-0.5 text-[0.72em] text-ink-mute">
        {m.topicLabel}{m.whenLabel ? ` · ${m.whenLabel}` : ""}
      </div>

      {/* 🔴 「기다리는 중」을 「안 했다」와 구별해 말한다 (AC-6.2) */}
      {m.bucket === "WAITING" ? (
        <p className="mt-1.5 text-[0.78em] text-ink-soft">{waitingNotice}</p>
      ) : null}
      {m.bucket === "REJECTED" ? (
        <p className="mt-1.5 text-[0.78em] text-miss">
          {rejectedPrefix}{m.rejectReason ? ` — ${m.rejectReason}` : ""}
        </p>
      ) : null}
      {m.backfilled ? (
        <p className="mt-1.5 text-[0.78em] text-primary-d">{backfilledNotice}</p>
      ) : null}

      {action === "done" ? (
        <form action={markMissionDone} className="mt-2 grid gap-1.5">
          <input type="hidden" name="missionId" value={m.id} />
          {/* 🔴 사진은 선택이다. 필수로 하면 찍을 수 없는 실천은 아예 못 올린다 */}
          <label className="grid gap-1">
            <span className="text-[0.72em] text-ink-mute">{photoLabel}</span>
            {/* 🔴 `capture` 를 넣지 않는다 — 강제 촬영은 요구가 아니다.
                이미 찍어 둔 사진도 고를 수 있어야 한다 */}
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp"
                   className="min-h-touch w-full rounded-card border border-line bg-surface px-2 py-2 text-[0.72em]" />
            <span className="text-[0.7em] text-ink-mute">{photoNotice}</span>
          </label>
          <button className="min-h-touch w-full rounded-card bg-primary text-[0.86em] font-bold text-white">
            {doneLabel}
          </button>
        </form>
      ) : null}
      {action === "undo" ? (
        <form action={undoMissionDone} className="mt-2">
          <input type="hidden" name="missionId" value={m.id} />
          <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.8em] text-ink-soft">
            {undoLabel}
          </button>
        </form>
      ) : null}
    </li>
  );
}

export default async function ChildMissionsPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="미션">
        <Empty emoji="🎯" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const board = await getMissionBoard(access.childId);
  const nothing = board.todo.length + board.waiting.length + board.settled.length === 0;

  return (
    <Screen role="아이 화면" title="미션">
      {nothing ? <Empty emoji="🎯" {...empty} /> : null}

      {board.todo.length > 0 ? (
        <>
          <h2 className="mb-1.5 text-[0.8em] font-bold">{sections.todo}</h2>
          <ul className="grid gap-1.5">{board.todo.map((m) => <Row key={m.id} m={m} action="done" />)}</ul>
        </>
      ) : null}

      {board.waiting.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-[0.8em] font-bold">{sections.waiting}</h2>
          <ul className="grid gap-1.5">{board.waiting.map((m) => <Row key={m.id} m={m} action="undo" />)}</ul>
        </>
      ) : null}

      {board.settled.length > 0 ? (
        <>
          <h2 className="mb-1.5 mt-4 text-[0.8em] font-bold">{sections.settled}</h2>
          <ul className="grid gap-1.5">{board.settled.map((m) => <Row key={m.id} m={m} />)}</ul>
        </>
      ) : null}
    </Screen>
  );
}
