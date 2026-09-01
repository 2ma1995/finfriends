import { Screen, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getMissionBoard } from "@/modules/mission";
import type { MissionView } from "@/contracts/mission";
import { attachMissionPhoto, markMissionDone, undoMissionDone } from "@/app/actions/mission";
import {
  backfilledNotice, consentRequired, doneLabel, empty, intro, noDevice, photoAttached,
  photoLabel, photoLater, photoNotice, photoReplace, photoResult, rejectedPrefix,
  sections, source, undoLabel, waitingNotice,
} from "./missions.fixture";

// PRC-001 — 미션. 🔴 아이가 하는 일은 「했어요」 하나뿐이다. 승인은 보호자가 한다
export const metadata = { title: "미션 · 핀프렌즈" };

/**
 * 사진 고르는 칸 — 🔴 **`accept` 를 `image/*` 로 둔다.**
 *
 * 예전엔 `image/jpeg,image/png,image/webp` 였다. 서버가 받는 형식을 그대로 적은 것인데,
 * **iOS 사파리는 MIME 을 하나하나 적으면 「사진 찍기」를 안 띄운다** — 파일 고르기만 나온다.
 * 그래서 아이 폰에서는 **찍을 수가 없었다.** 형식 검사는 서버가 이미 한다(`PHOTO_MIME`).
 *
 * 🔴 `capture` 는 여전히 안 넣는다 — 강제 촬영은 요구가 아니고,
 *    이미 찍어 둔 사진도 고를 수 있어야 한다.
 */
function PhotoField({ label }: { label: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[0.72em] text-ink-mute">{label}</span>
      <input type="file" name="photo" accept="image/*"
             className="min-h-touch w-full rounded-card border border-line bg-surface px-2 py-2 text-[0.72em]" />
      <span className="text-[0.7em] text-ink-mute">{photoNotice}</span>
    </label>
  );
}

function Row({ m, action }: { m: MissionView; action?: "done" | "undo" }) {
  /**
   * 🔴 **지금 할 것이 가장 안 눈에 띄었다.** 기다림·완료·거절은 각각 색이 있는데
   *    정작 **해야 할 것(`TODO`)만 무색**이었다 — 화면에서 제일 밋밋한 칸이
   *    제일 급한 칸이었다는 뜻이다.
   */
  const tone =
    m.bucket === "WAITING" ? "border-star bg-star-bg"
    : m.bucket === "REJECTED" ? "border-miss-line bg-miss-bg"
    : m.bucket === "DONE" ? "border-primary-l/50 bg-primary-bg"
    : m.bucket === "TODO" ? "border-primary bg-surface shadow-[0_1px_0_var(--ff-primary-l)]"
    : "border-line bg-surface";

  return (
    <li className={`rounded-card border p-3 ${tone}`}>
      {/*
        🔴 **어느 칸에서 온 것인지 · 누가 낸 것인지**를 제목보다 먼저 말한다.
           예전엔 영역 이름이 날짜와 함께 흐린 한 줄에 묻혀 있어서
           **네 영역이 섞인 목록에서 무엇이 무엇인지 알 수 없었다.**
      */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-full border border-line-2 bg-canvas px-1.5 py-0.5 text-[0.66em] font-bold">
          {m.icon} {m.topicLabel}
        </span>
        {/* 🔴 「내가 배워서 한 것」과 「시킨 것」은 아이에게 다른 일이다 */}
        <span className={`rounded-full px-1.5 py-0.5 text-[0.66em] ${
          m.fromLesson ? "bg-primary-bg text-primary-d" : "bg-star-bg text-star-d"}`}>
          {m.fromLesson ? `📚 ${source.lesson}` : `🎯 ${source.parent}`}
        </span>
        {m.whenLabel ? <span className="text-[0.66em] text-ink-mute">{m.whenLabel}</span> : null}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <b className="text-[0.9em]">{m.title}</b>
        <span className="shrink-0 text-[0.78em]">
          {/* 🔴 금액이 걸린 미션은 **용돈이 생긴다.** 별만 보이면 「벌기」가 안 보인다 */}
          {m.payoutWon > 0 ? (
            <b className="text-primary-d">{m.payoutWon.toLocaleString("ko-KR")}원</b>
          ) : null}
          <span className="text-star-d">{m.payoutWon > 0 ? " · " : ""}⭐ {m.reward}</span>
        </span>
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
          <PhotoField label={photoLabel} />
          <button className="min-h-touch w-full rounded-card bg-primary text-[0.86em] font-bold text-white">
            {doneLabel}
          </button>
        </form>
      ) : null}
      {/*
        🔴 **완료 뒤에도 사진을 붙일 수 있어야 한다.** 아이는 **하고 나서** 찍는다 —
           누르기 전에 찍어 두라는 건 어른의 순서다. 예전엔 이 길이 아예 없었다.
        🔴 이미 붙였으면 그렇다고 **말해 준다.** 안 그러면 「올라갔나?」 싶어 또 올린다.
      */}
      {action === "undo" ? (
        <form action={attachMissionPhoto} className="mt-2 grid gap-1.5">
          <input type="hidden" name="missionId" value={m.id} />
          {m.hasPhoto ? (
            <p className="text-[0.76em] font-bold text-primary-d">{photoAttached}</p>
          ) : null}
          <PhotoField label={m.hasPhoto ? photoReplace : photoLater} />
          <button className="min-h-touch w-full rounded-card border border-primary bg-primary-bg text-[0.8em] font-bold text-primary-d">
            {m.hasPhoto ? photoReplace : photoLater}
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

export default async function ChildMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string }>;
}) {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="미션">
        <Empty emoji="🎯" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const [board, sp] = await Promise.all([getMissionBoard(access.childId), searchParams]);
  const photoMsg = sp.photo ? photoResult[sp.photo] ?? photoResult.NOT_FOUND : null;
  const nothing = board.todo.length + board.waiting.length + board.settled.length === 0;

  return (
    <Screen role="아이 화면" title="미션">
      {/* 🔴 사진이 올라갔는지 · 왜 안 됐는지 **말해 준다.** 조용히 넘기면 또 올린다 */}
      {photoMsg ? (
        <p className={`mb-2 rounded-card border px-3 py-2 text-center text-[0.84em] font-bold ${
          sp.photo === "ok" ? "border-primary-l bg-primary-bg text-primary-d"
                            : "border-miss-line bg-miss-bg text-miss"}`}>
          {photoMsg}
        </p>
      ) : null}

      {/* 🔴 **미션과 실천이 아이 눈에 똑같다.** 이 화면이 무엇인지 먼저 말한다 */}
      <p className="mb-2 text-[0.78em] leading-relaxed text-ink-mute">{intro}</p>

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
