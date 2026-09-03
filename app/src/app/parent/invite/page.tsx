import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { InviteLink } from "@/components/parent/InviteLink";
import { WaitForDevice } from "@/components/parent/WaitForDevice";
import { findChild } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import { howTo, inviteLink, noCredentialNotice, reRegisterNotice, rules, previewLink, waitNotice } from "./invite.fixture";

// CON-003 — 자녀 초대. 온보딩 4단계. 링크는 자격증명이 아니라 기기 등록 수단이다
export const metadata = { title: "자녀 초대 · 핀프렌즈" };

export default async function ParentInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const { error, from } = await searchParams;
  const child = await findChild(guardian.guardianId);

  /**
   * 🔴 **온보딩 4단계일 때와 「다시 등록」일 때 머리가 달라야 한다.**
   *
   *    한동안 `sub` 가 「4 / 6단계」로 못박혀 있고 돌아가기가 늘 「시작하기」였다.
   *    온보딩을 다 끝낸 부모가 기기를 다시 등록하러 오면 **끝난 단계 번호가 뜨고**
   *    돌아가기가 할 일 목록으로 보낸다 — 자기가 어디 있는지 모르게 된다.
   */
  const again = from === "mypage";
  const head = again
    ? { sub: reRegisterNotice.sub, back: { href: "/parent/mypage", label: "내 정보" } }
    : { sub: "4 / 6단계", back: { href: "/parent/onboarding", label: "시작하기" } };

  if (!child) {
    return (
      <Screen title="자녀 초대" sub={head.sub} back={head.back}>
        <Empty
          emoji="🐣"
          title="초대할 아이가 아직 없어요"
          body="아이 프로필을 먼저 만들면 그 아이의 기기를 등록할 수 있어요."
          hint="온보딩 3단계 · 아이 프로필"
        />
        <Link
          href="/parent/child/new"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  return (
    <Screen title={again ? reRegisterNotice.title : "자녀 초대"} sub={head.sub} back={head.back}>
      {/*
        🔴 **다시 등록하러 온 부모에게는 먼저 그 사실을 말한다.**
           온보딩 화면과 글자가 똑같으면 「내가 처음으로 되돌아갔나」로 읽는다.
      */}
      {again ? (
        <div className="mb-2.5">
          <Card tone="grow">
            <p className="text-sub leading-relaxed">{reRegisterNotice.body}</p>
          </Card>
        </div>
      ) : null}
      <Card>
        <h2 className="text-cap tracking-[0.03em] text-ink-mute">초대할 아이</h2>
        <p className="mt-1 text-body">
          <b>{child.displayName}</b>
          <span className="text-ink-soft"> · {child.birthYear}년생 · {child.deviceLabel}</span>
        </p>
      </Card>

      <section className="mt-2.5">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">쓰는 법</h2>
        <ol className="mt-1.5 grid gap-1">
          {howTo.map((line, i) => (
            <li key={line} className="flex items-baseline gap-2 rounded-card bg-surface px-3 py-2">
              <span className="text-sub tabular-nums text-ink-mute">{i + 1}</span>
              <span className="flex-1 text-sub leading-relaxed text-ink-soft">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-2.5">
        <Card tone="grow">
          <h2 className="text-cap tracking-[0.03em] text-primary-d">{noCredentialNotice.title}</h2>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{noCredentialNotice.body}</p>
        </Card>
      </div>

        {/* 🔴 **길이 둘이다.** 이 폰을 아이 기기로 만들거나, 링크를 아이 폰에 보내거나 —
               둘 다 같은 1회용 코드를 같은 `/child/enter` 로 소진한다 (D63) */}
        <InviteLink make={inviteLink.make} remake={inviteLink.remake} hint={inviteLink.hint}
                    copyLabel={inviteLink.copyLabel} copied={inviteLink.copied} failed={inviteLink.failed} />

      {/*
        🔴 **부모는 여기서 기다린다.** 링크를 넘겨주고 아이가 열기를 기다리는 중이라,
           등록이 끝나면 화면이 스스로 다음 단계로 간다 (`D76`).
           안 그러면 아무 일도 안 일어난 것처럼 보여 링크를 다시 만들게 된다.
      */}
      <WaitForDevice waiting={waitNotice.waiting} done={waitNotice.done} />

      <section className="mt-2.5">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">등록 규칙</h2>
        <dl className="mt-1.5 grid gap-1">
          {rules.map((r) => (
            <div key={r.k} className="flex items-baseline justify-between gap-3 rounded-card bg-surface px-3 py-2">
              <dt className="shrink-0 text-sub text-ink-mute">{r.k}</dt>
              <dd className="text-right text-sub text-ink-soft">{r.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {error ? (
        <p className="mt-2.5 rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-sub leading-relaxed text-miss">
          {error}
        </p>
      ) : null}

      <Link
        href={previewLink.href}
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-center text-sub font-bold text-white"
      >
        {previewLink.label}
      </Link>
    </Screen>
  );
}
