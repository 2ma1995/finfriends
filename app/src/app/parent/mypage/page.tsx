import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { getGuardianEmail, getMyPage } from "@/modules/account";
import { findChild } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import { signOutAction } from "@/app/actions/auth";
import { withdrawConsentAction } from "@/app/actions/consent";
import { revokeDeviceAction } from "@/app/actions/parent-account";
import { CARD_STEPS } from "@/contracts/account";
import { clearPinAction, setPinAction } from "@/app/actions/child-mode-pin";
import { saveSchoolEndAction } from "@/app/actions/parent-schedule";
import { getSchedule, toClock } from "@/modules/schedule";
import {
  cardNotice, deviceNotice, notCollected, pinChangeLabel, pinClearLabel, pinClearNotice,
  pinDone, pinErrors, pinLabel, pinNotice, pinSetLabel,
  schoolDone, schoolErrors, schoolNotice, schoolSaveLabel,
} from "./mypage.fixture";

// 마이페이지 — 보호자 계정 · 아이 · 기기 · 카드. 어긋남 대장 D20
export const metadata = { title: "내 정보 · 핀프렌즈" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-card bg-surface px-3 py-2">
      <span className="shrink-0 text-sub text-ink-mute">{label}</span>
      <span className="text-right text-sub text-ink-soft">{value}</span>
    </div>
  );
}

export default async function ParentMyPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string; pinErr?: string; school?: string; schoolErr?: string }>;
}) {
  const sp = await searchParams;
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const email = await getGuardianEmail(guardian.authRef);
  const view = await getMyPage(guardian.guardianId, email);

  /**
   * 🔴 아이 id 는 **세션의 보호자에게서** 찾는다 (`REQ-NF-009` — identity 안에서만).
   *    하교 시각은 아이 단위라 아이가 없으면 정할 수 없다.
   */
  const child = await findChild(guardian.guardianId);
  const schedule = child ? await getSchedule(child.id) : null;
  const schoolClock = schedule ? toClock(schedule.schoolEndMin) : null;

  return (
    <Screen role="부모 화면" title="내 정보">
      {/* ── 계정 ── */}
      <section>
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">계정</h2>
        <div className="mt-1.5 grid gap-1">
          <Row label="이메일" value={view.email} />
          <Row
            label="법정대리인 동의"
            value={view.consentCompleted ? `완료 · ${view.consentLabel ?? ""}` : "아직 안 했어요"}
          />
        </div>
      </section>

      {/* ── 아이 ── */}
      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">아이</h2>
        {view.child ? (
          <div className="mt-1.5 grid gap-1">
            <Row label="이름" value={view.child.displayName} />
            <Row label="태어난 해" value={`${view.child.birthYear}년`} />
            <Row label="기기" value={view.child.deviceLabel} />
          </div>
        ) : (
          <div className="mt-1.5">
            <Empty
              emoji="🐣"
              title="등록한 아이가 없어요"
              body="아이 프로필을 만들면 여기에 나타납니다."
              hint="온보딩 3단계"
            />
            <Link
              href="/parent/child/new"
              className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-sub font-bold text-white"
            >
              아이 프로필 만들기
            </Link>
          </div>
        )}
      </section>

      {/* ── 등록된 아이 기기 ── */}
      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">등록된 아이 기기</h2>
        {view.devices.length === 0 ? (
          <p className="mt-1.5 rounded-card border border-dashed border-line-2 px-3 py-3 text-sub leading-relaxed text-ink-mute">
            {deviceNotice.empty}
          </p>
        ) : (
          <ul className="mt-1.5 grid gap-1">
            {view.devices.map((d) => (
              <li key={d.deviceRef} className="rounded-card bg-surface p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-sub">{d.childName}의 기기</b>
                  <span className="text-cap text-ink-mute">{d.lastSeenLabel}</span>
                </div>
                <p className="mt-0.5 text-sub text-ink-mute">{d.registeredLabel} 등록</p>
                {/* 🔴 보호자 경로 시도는 S5 감사 대상이다. 0이 정상이므로 있으면 드러낸다 */}
                {d.blockedAttempts > 0 ? (
                  <p className="mt-1 text-sub text-miss">
                    부모 화면을 {d.blockedAttempts}번 열려고 했어요 · 서버가 막았습니다
                  </p>
                ) : null}
                <form action={revokeDeviceAction} className="mt-2">
                  <input type="hidden" name="deviceRef" value={d.deviceRef} />
                  <button
                    type="submit"
                    className="min-h-touch w-full rounded-card border border-miss-line text-sub text-miss"
                  >
                    이 기기 해제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{deviceNotice.hint}</p>
      </section>

      {/* ── 카드 · 🔴 시연용 가짜다 (D20). 과정은 /parent/card 가 갖는다 ── */}
      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">아이 카드</h2>
        <div className="mt-1.5">
          <Card tone={view.card.active ? "grow" : "surface"}>
            <div
              className="rounded-card px-4 py-5"
              style={{
                background: view.card.active
                  ? "linear-gradient(135deg, var(--ff-primary-d), var(--ff-primary))"
                  : "linear-gradient(135deg, var(--ff-line-2), var(--ff-line))",
              }}
            >
              <span className={`block text-cap tracking-[0.14em] ${view.card.active ? "text-white/70" : "text-ink-mute"}`}>
                FINFRIENDS
              </span>
              <b className={`mt-3 block text-body tabular-nums tracking-[0.06em] ${view.card.active ? "text-white" : "text-ink-soft"}`}>
                {view.card.maskedNumber}
              </b>
              <span className={`mt-2 block text-cap ${view.card.active ? "text-white/80" : "text-ink-mute"}`}>
                {view.card.active
                  ? `${view.child?.displayName ?? "아이"} · ${view.card.issuedLabel ?? ""} 등록`
                  : view.card.status === null
                    ? "아직 신청하지 않았어요"
                    : `${CARD_STEPS[view.card.stepIndex]?.title ?? ""} 단계`}
              </span>
            </div>

            <p className="mt-2 text-sub leading-relaxed text-miss">{cardNotice.mock}</p>

            <Link
              href="/parent/card"
              className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-sub font-bold text-white"
            >
              {view.card.status === null ? "카드 신청하기" : view.card.active ? "카드 보기" : "신청 이어서 하기"}
            </Link>
          </Card>
        </div>
      </section>

      {/* ── 아동 모드 PIN ── */}
      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">아동 모드 잠금</h2>
        <div className="mt-1.5">
          <Card tone={view.pinSet ? "grow" : "surface"}>
            <Row label="PIN" value={view.pinSet ? "정해 뒀어요" : "아직 없어요"} />
            <p className="mt-2 text-sub leading-relaxed text-ink-soft">{pinNotice.body}</p>
            <p className="mt-1 text-sub leading-relaxed text-ink-mute">{pinNotice.why}</p>

            {sp.pin ? (
              <p className="mt-2 text-sub text-primary-d">{pinDone[sp.pin] ?? ""}</p>
            ) : null}
            {sp.pinErr ? (
              <p className="mt-2 text-sub leading-relaxed text-miss">
                {pinErrors[sp.pinErr] ?? pinErrors.BAD_FORMAT}
              </p>
            ) : null}

            {/*
              🔴 `type="password"` 다. 아이가 옆에서 보는 상황을 전제로 만든다.
                 서버가 형식과 「너무 쉬운 값」을 다시 검사한다 — 화면 검사는 우회된다.
            */}
            <form action={setPinAction} className="mt-2 flex gap-1.5">
              <input
                name="pin" type="password" inputMode="numeric" autoComplete="off"
                pattern="\d{4}" maxLength={4} required placeholder={pinLabel}
                className="min-h-touch flex-1 rounded-card border border-line bg-surface px-3 text-center tracking-[0.3em] tabular-nums"
              />
              <button className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-sub font-bold text-white">
                {view.pinSet ? pinChangeLabel : pinSetLabel}
              </button>
            </form>

            <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{pinNotice.rule}</p>

            {view.pinSet ? (
              <form action={clearPinAction} className="mt-2">
                <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-sub text-ink-soft">
                  {pinClearLabel}
                </button>
                {/* 🔴 지우면 무슨 일이 생기는지 말한다 */}
                <p className="mt-1 text-cap leading-relaxed text-ink-mute">{pinClearNotice}</p>
              </form>
            ) : null}
          </Card>
        </div>
      </section>

      {/*
        ── 하교 시각 — D41 ──
        🔴 계획 카드의 가장 큰 구멍이 「적으라고 말할 자리가 없다」였다.
           아이가 그냥 나가면 대조할 것이 없다 (C5 사각지대).
      */}
      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">{schoolNotice.title}</h2>
        <div className="mt-1.5">
          <Card tone={schoolClock ? "grow" : "surface"}>
            <p className="text-sub leading-relaxed text-ink-soft">{schoolNotice.body}</p>
            <p className="mt-1 text-sub leading-relaxed text-ink-mute">{schoolNotice.once}</p>

            {sp.school ? <p className="mt-2 text-sub text-primary-d">{schoolDone}</p> : null}
            {sp.schoolErr ? (
              <p className="mt-2 text-sub text-miss">
                {schoolErrors[sp.schoolErr] ?? schoolErrors.BAD_TIME}
              </p>
            ) : null}

            <form action={saveSchoolEndAction} className="mt-2 flex gap-1.5">
              <input
                name="clock" type="time" required defaultValue={schoolClock ?? ""}
                className="min-h-touch flex-1 rounded-card border border-line bg-surface px-3 text-body tabular-nums"
              />
              <button className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-sub font-bold text-white">
                {schoolSaveLabel}
              </button>
            </form>

            {/* 🔴 바꾸면 그날 다시 묻는다 — 안 적으면 잘못 넣었다 고친 날 하루를 잃는다 */}
            <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{schoolNotice.change}</p>
            {!schoolClock ? (
              <p className="mt-1 text-cap leading-relaxed text-ink-mute">{schoolNotice.empty}</p>
            ) : null}
          </Card>
        </div>
      </section>

      {/* ── 받지 않는 것 ── */}
      <section className="mt-4">
        <Card>
          <h2 className="text-cap tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{notCollected.join(" · ")}</p>
        </Card>
      </section>

      {/* ── 되돌리기 ── */}
      <section className="mt-4 border-t border-line pt-4">
        {view.consentCompleted ? (
          <form action={withdrawConsentAction}>
            <button
              type="submit"
              className="min-h-touch w-full rounded-card border border-miss-line text-sub text-miss"
            >
              동의 철회하기
            </button>
          </form>
        ) : null}
        <p className="mt-1.5 text-center text-cap leading-relaxed text-ink-mute">
          철회하면 아이 화면이 바로 잠깁니다. 기기를 다시 등록할 필요는 없어요.
        </p>

        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="min-h-touch w-full rounded-card border border-line-2 text-sub text-ink-soft"
          >
            로그아웃
          </button>
        </form>
        <p className="mt-1.5 text-center text-cap leading-relaxed text-ink-mute">
          등록한 아이 기기는 로그아웃해도 그대로 열립니다.
        </p>

        {/*
          🔴 **탈퇴는 여기서 실행되지 않는다** (`FR-041` · `AC-041-1`).
             확인 화면을 한 번 거친다 — 되돌릴 수 없는 일은 실수로 눌릴 수 있는 자리에 두지 않는다.
             그래서 버튼이 아니라 링크다.
        */}
        <Link
          href="/parent/mypage/withdraw"
          className="mt-6 flex min-h-touch w-full items-center justify-center rounded-card border border-line text-sub text-ink-mute"
        >
          탈퇴하기
        </Link>
        <p className="mt-1.5 text-center text-cap leading-relaxed text-ink-mute">
          모은 별과 자란 나무는 되돌릴 수 없어요.
        </p>
      </section>
    </Screen>
  );
}
