import { photoRuleOf, type MissionView } from "@/contracts/mission";
import { attachMissionPhoto, markMissionDone, undoMissionDone } from "@/app/actions/mission";
import { PhotoPicker } from "@/components/child/PhotoPicker";
import {
  autoDoneNotice, backfilledNotice, checkLaterLabel, checkLaterWhy,
  doneLabel, expiredBody, expiredTitle, noPhotoWhy,
  photoAttached, photoLabel, photoLabelOptional, photoLater, photoNotice, photoReplace, photoShrinking,
  photoWhy, photoWhyOptional, rejectedPrefix, source, undoLabel, waitingNotice,
} from "@/app/child/missions/missions.fixture";

/**
 * 미션 한 줄 — 🔴 **미션 화면과 지난 미션 화면이 같은 줄을 쓴다.**
 *    베껴 두면 한쪽만 고쳐진다. 사진 규칙 · 만료 문구 · 영역 칩이 전부 여기 있다.
 */
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
/**
 * 🔴 **사진 칸은 클라이언트 덩이(`PhotoPicker`)로 옮겼다** — 보내기 전에 폰에서
 *    줄여야 하기 때문이다. 폰 원본(2~5MB)이 Server Action 기본 한도(1MB)에서
 *    잘려 **오류 페이지**가 났다 (2026-09-03 제보).
 *    문구는 여기(서버)가 갖고 넘긴다 — fixture 는 서버 쪽 물건이다.
 */
function PhotoField({ required }: { required: boolean }) {
  return (
    <PhotoPicker
      required={required}
      label={required ? photoLabel : photoLabelOptional}
      why={required ? photoWhy : photoWhyOptional}
      notice={photoNotice}
      working={photoShrinking}
    />
  );
}

export function MissionRow(
  { m, action, notice }: { m: MissionView; action?: "done" | "undo"; notice?: string | null },
) {
  // 🔴 아이 화면과 서버가 **같은 함수**를 본다. 갈라지면 한쪽만 사진을 기다린다
  const rule = photoRuleOf(m.topic, m.fromLesson);
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
    /* 🔴 **거절색을 쓰지 않는다.** 아이가 잘못한 게 아니라 부모가 못 본 것이다 */
    : m.bucket === "EXPIRED" ? "border-dashed border-line-2 bg-canvas"
    /* 🔴 뜻 없는 기본 선은 안 두른다. 위 갈래가 전부 **상태**다 */
    : "border-transparent bg-surface";

  return (
    <li className={`rounded-card border p-3 ${tone}`}>
      {/*
        🔴 **어느 칸에서 온 것인지 · 누가 낸 것인지**를 제목보다 먼저 말한다.
           예전엔 영역 이름이 날짜와 함께 흐린 한 줄에 묻혀 있어서
           **네 영역이 섞인 목록에서 무엇이 무엇인지 알 수 없었다.**
      */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-full border border-line-2 bg-canvas px-1.5 py-0.5 text-micro font-bold">
          {m.icon} {m.topicLabel}
        </span>
        {/* 🔴 「내가 배워서 한 것」과 「시킨 것」은 아이에게 다른 일이다 */}
        <span className={`rounded-full px-1.5 py-0.5 text-micro ${
          m.fromLesson ? "bg-primary-bg text-primary-d" : "bg-star-bg text-star-d"}`}>
          {m.fromLesson ? `📚 ${source.lesson}` : `🎯 ${source.parent}`}
        </span>
        {m.whenLabel ? <span className="text-micro text-ink-mute">{m.whenLabel}</span> : null}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <b className="text-body">{m.title}</b>
        <span className="shrink-0 text-sub">
          {/* 🔴 금액이 걸린 미션은 **용돈이 생긴다.** 별만 보이면 「벌기」가 안 보인다 */}
          {m.payoutWon > 0 ? (
            <b className="text-primary-d">{m.payoutWon.toLocaleString("ko-KR")}원</b>
          ) : null}
          <span className="text-star-d">{m.payoutWon > 0 ? " · " : ""}⭐ {m.reward}</span>
        </span>
      </div>

      {/* 🔴 「기다리는 중」을 「안 했다」와 구별해 말한다 (AC-6.2) */}
      {m.bucket === "WAITING" ? (
        <p className="mt-1.5 text-sub text-ink-soft">{waitingNotice}</p>
      ) : null}
      {/* 🔴 「거절」이 아니라 **「못 봤다」**로 말한다 (AC-032-3) */}
      {m.bucket === "EXPIRED" ? (
        <p className="mt-1.5 text-sub leading-relaxed text-ink-soft">
          <b className="block">⏳ {expiredTitle}</b>
          {expiredBody}
        </p>
      ) : null}
      {m.bucket === "REJECTED" ? (
        <p className="mt-1.5 text-sub text-miss">
          {rejectedPrefix}{m.rejectReason ? ` — ${m.rejectReason}` : ""}
        </p>
      ) : null}
      {/* 🔴 **「부모님이 확인했어요」가 아니다.** 부모는 못 봤다 — 별은 같아도 근거가 다르다 */}
      {m.autoDone ? (
        <p className="mt-1.5 text-sub text-primary-d">⏳ {autoDoneNotice}</p>
      ) : null}
      {m.backfilled ? (
        <p className="mt-1.5 text-sub text-primary-d">{backfilledNotice}</p>
      ) : null}

      {action === "done" ? (
        <form action={markMissionDone} className="mt-2 grid gap-1.5">
          <input type="hidden" name="missionId" value={m.id} />
          {/*
            🔴 **벌기 부모 미션만 사진을 받는다** (D49). 잘 쓰기는 카드 내역이,
               모으기는 통장이, 불리기는 적금 회차가 답한다 — 앱이 아는 것을
               아이한테 다시 찍어 오라고 하지 않는다.
            🔴 **왜 없는지도 말한다.** 어떤 칸엔 있고 어떤 칸엔 없으면 「왜 다르지」가 된다.
          */}
          {rule === "NONE" ? (
            <p className="text-cap leading-relaxed text-ink-mute">{noPhotoWhy[m.topic]}</p>
          ) : (
            <PhotoField required={rule === "REQUIRED"} />
          )}
          {/* 🔴 **버튼 바로 위에서 말한다.** 화면 맨 위 띠는 눌러 놓고 못 본다 */}
          {notice ? (
            <p className="rounded-card border border-miss-line bg-miss-bg px-2.5 py-2 text-cap font-bold text-miss">
              {notice}
            </p>
          ) : null}
          <button className="min-h-touch w-full rounded-card bg-primary text-sub font-bold text-white">
            {doneLabel}
          </button>
          {/*
            🔴 **사진이 증거의 유일한 형태가 아니다** (사용자 지적).
               부모가 와서 직접 보고 확인하면 그게 더 확실하다 — 원래 그렇게 하던 일이다.
               이 길이 없으면 사진을 못 찍는 아이는 **한 일을 올릴 방법이 아예 없다.**

            🔴 **같은 폼 · 같은 액션**이다. `name` 이 실린 버튼만 값을 보내므로,
               위 「했어요」를 누르면 `checkLater` 는 안 실린다 — 고른 것만 전해진다.
            🔴 버튼을 **아래에 · 약하게** 둔다. 기본은 여전히 사진이다.
          */}
          {rule === "REQUIRED" ? (
            <>
              <button name="checkLater" value="1"
                      className="min-h-touch w-full rounded-card border border-primary bg-primary-bg text-sub font-bold text-primary-d">
                👀 {checkLaterLabel}
              </button>
              <p className="text-cap leading-relaxed text-ink-mute">{checkLaterWhy}</p>
            </>
          ) : null}
        </form>
      ) : null}
      {/*
        🔴 **완료 뒤에도 사진을 붙일 수 있어야 한다.** 아이는 **하고 나서** 찍는다 —
           누르기 전에 찍어 두라는 건 어른의 순서다. 예전엔 이 길이 아예 없었다.
        🔴 이미 붙였으면 그렇다고 **말해 준다.** 안 그러면 「올라갔나?」 싶어 또 올린다.
      */}
      {action === "undo" && rule !== "NONE" ? (
        <form action={attachMissionPhoto} className="mt-2 grid gap-1.5">
          <input type="hidden" name="missionId" value={m.id} />
          {m.hasPhoto ? (
            <p className="text-cap font-bold text-primary-d">{photoAttached}</p>
          ) : null}
          <PhotoField required={false} />
          <button className="min-h-touch w-full rounded-card border border-primary bg-primary-bg text-sub font-bold text-primary-d">
            {m.hasPhoto ? photoReplace : photoLater}
          </button>
        </form>
      ) : null}

      {action === "undo" ? (
        <form action={undoMissionDone} className="mt-2">
          <input type="hidden" name="missionId" value={m.id} />
          <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-sub text-ink-soft">
            {undoLabel}
          </button>
        </form>
      ) : null}
    </li>
  );
}
