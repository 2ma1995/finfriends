import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { findChild } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import { howTo, noCredentialNotice, rules, previewLink } from "./invite.fixture";

// CON-003 — 자녀 초대. 온보딩 4단계. 링크는 자격증명이 아니라 기기 등록 수단이다
export const metadata = { title: "자녀 초대 · 핀프렌즈" };

export default async function ParentInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const { error } = await searchParams;
  const child = await findChild(guardian.guardianId);

  if (!child) {
    return (
      <Screen role="부모 화면" title="자녀 초대" sub="4 / 6단계" back={{ href: "/parent/onboarding", label: "시작하기" }}>
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
    <Screen
      role="부모 화면"
      title="자녀 초대"
      sub="4 / 6단계"
      back={{ href: "/parent/onboarding", label: "시작하기" }}
    >
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
            <li key={line} className="flex items-baseline gap-2 rounded-card border border-line bg-surface px-3 py-2">
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

      <section className="mt-2.5">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">등록 규칙</h2>
        <dl className="mt-1.5 grid gap-1">
          {rules.map((r) => (
            <div key={r.k} className="flex items-baseline justify-between gap-3 rounded-card border border-line bg-surface px-3 py-2">
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
