import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { getGuardianEmail, getMyPage } from "@/modules/account";
import { currentGuardian } from "@/lib/session/guardian-session";
import { signOutAction } from "@/app/actions/auth";
import { withdrawConsentAction } from "@/app/actions/consent";
import { revokeDeviceAction } from "@/app/actions/parent-account";
import { CARD_STEPS } from "@/contracts/account";
import { cardNotice, deviceNotice, pinNotice, notCollected } from "./mypage.fixture";

// 마이페이지 — 보호자 계정 · 아이 · 기기 · 카드. 어긋남 대장 D20
export const metadata = { title: "내 정보 · 핀프렌즈" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-card border border-line bg-surface px-3 py-2">
      <span className="shrink-0 text-[0.8em] text-ink-mute">{label}</span>
      <span className="text-right text-[0.84em] text-ink-soft">{value}</span>
    </div>
  );
}

export default async function ParentMyPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const email = await getGuardianEmail(guardian.authRef);
  const view = await getMyPage(guardian.guardianId, email);

  return (
    <Screen role="부모 화면" title="내 정보">
      {/* ── 계정 ── */}
      <section>
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">계정</h2>
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
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">아이</h2>
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
              className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.88em] font-bold text-white"
            >
              아이 프로필 만들기
            </Link>
          </div>
        )}
      </section>

      {/* ── 등록된 아이 기기 ── */}
      <section className="mt-4">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">등록된 아이 기기</h2>
        {view.devices.length === 0 ? (
          <p className="mt-1.5 rounded-card border border-dashed border-line-2 px-3 py-3 text-[0.82em] leading-relaxed text-ink-mute">
            {deviceNotice.empty}
          </p>
        ) : (
          <ul className="mt-1.5 grid gap-1">
            {view.devices.map((d) => (
              <li key={d.deviceRef} className="rounded-card border border-line bg-surface p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[0.86em]">{d.childName}의 기기</b>
                  <span className="text-[0.74em] text-ink-mute">{d.lastSeenLabel}</span>
                </div>
                <p className="mt-0.5 text-[0.78em] text-ink-mute">{d.registeredLabel} 등록</p>
                {/* 🔴 보호자 경로 시도는 S5 감사 대상이다. 0이 정상이므로 있으면 드러낸다 */}
                {d.blockedAttempts > 0 ? (
                  <p className="mt-1 text-[0.78em] text-miss">
                    부모 화면을 {d.blockedAttempts}번 열려고 했어요 · 서버가 막았습니다
                  </p>
                ) : null}
                <form action={revokeDeviceAction} className="mt-2">
                  <input type="hidden" name="deviceRef" value={d.deviceRef} />
                  <button
                    type="submit"
                    className="min-h-touch w-full rounded-card border border-miss-line text-[0.82em] text-miss"
                  >
                    이 기기 해제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-[0.74em] leading-relaxed text-ink-mute">{deviceNotice.hint}</p>
      </section>

      {/* ── 카드 · 🔴 시연용 가짜다 (D20). 과정은 /parent/card 가 갖는다 ── */}
      <section className="mt-4">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">아이 카드</h2>
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
              <span className={`block text-[0.7em] tracking-[0.14em] ${view.card.active ? "text-white/70" : "text-ink-mute"}`}>
                FINFRIENDS
              </span>
              <b className={`mt-3 block text-[0.98em] tabular-nums tracking-[0.06em] ${view.card.active ? "text-white" : "text-ink-soft"}`}>
                {view.card.maskedNumber}
              </b>
              <span className={`mt-2 block text-[0.74em] ${view.card.active ? "text-white/80" : "text-ink-mute"}`}>
                {view.card.active
                  ? `${view.child?.displayName ?? "아이"} · ${view.card.issuedLabel ?? ""} 등록`
                  : view.card.status === null
                    ? "아직 신청하지 않았어요"
                    : `${CARD_STEPS[view.card.stepIndex]?.title ?? ""} 단계`}
              </span>
            </div>

            <p className="mt-2 text-[0.8em] leading-relaxed text-miss">{cardNotice.mock}</p>

            <Link
              href="/parent/card"
              className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.86em] font-bold text-white"
            >
              {view.card.status === null ? "카드 신청하기" : view.card.active ? "카드 보기" : "신청 이어서 하기"}
            </Link>
          </Card>
        </div>
      </section>

      {/* ── 아동 모드 PIN ── */}
      <section className="mt-4">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">아동 모드 잠금</h2>
        <div className="mt-1.5">
          <Card>
            <Row label="PIN" value={view.pinSet ? "설정됨" : "아직 없어요"} />
            <p className="mt-2 text-[0.8em] leading-relaxed text-ink-soft">{pinNotice.body}</p>
            <p className="mt-1 text-[0.78em] text-miss">{pinNotice.todo}</p>
          </Card>
        </div>
      </section>

      {/* ── 받지 않는 것 ── */}
      <section className="mt-4">
        <Card>
          <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{notCollected.join(" · ")}</p>
        </Card>
      </section>

      {/* ── 되돌리기 ── */}
      <section className="mt-4 border-t border-line pt-4">
        {view.consentCompleted ? (
          <form action={withdrawConsentAction}>
            <button
              type="submit"
              className="min-h-touch w-full rounded-card border border-miss-line text-[0.82em] text-miss"
            >
              동의 철회하기
            </button>
          </form>
        ) : null}
        <p className="mt-1.5 text-center text-[0.74em] leading-relaxed text-ink-mute">
          철회하면 아이 화면이 바로 잠깁니다. 기기를 다시 등록할 필요는 없어요.
        </p>

        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="min-h-touch w-full rounded-card border border-line-2 text-[0.84em] text-ink-soft"
          >
            로그아웃
          </button>
        </form>
        <p className="mt-1.5 text-center text-[0.74em] leading-relaxed text-ink-mute">
          등록한 아이 기기는 로그아웃해도 그대로 열립니다.
        </p>
      </section>
    </Screen>
  );
}
