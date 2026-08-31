import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { child, invite, howTo, noCredentialNotice, rules, previewLink } from "./invite.fixture";

// CON-003 — 자녀 초대. 온보딩 4단계. 링크는 자격증명이 아니라 기기 등록 수단이다
export const metadata = { title: "자녀 초대 · 핀프렌즈" };

export default function ParentInvitePage() {
  return (
    <Screen
      role="부모 화면"
      title="자녀 초대"
      sub="4 / 6단계"
      back={{ href: "/parent/onboarding", label: "시작하기" }}
    >
      <Card>
        <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">초대할 아이</h2>
        <p className="mt-1 text-[0.9em]">
          <b>{child.displayName}</b>
          <span className="text-ink-soft"> · {child.birthYear}년생 · {child.deviceLabel}</span>
        </p>
      </Card>

      <section className="mt-2.5">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">초대 링크</h2>
        <div className="mt-1.5 rounded-card border border-line bg-surface p-3">
          <p className="break-all text-[0.86em] text-ink">{invite.url}</p>
          <p className="mt-1 text-[0.74em] text-ink-mute">
            {invite.expiresIn} 뒤에 만료됩니다 · <span className="text-miss">예시값</span>
          </p>
          <button className="mt-2 min-h-touch w-full rounded-card bg-primary text-[0.88em] font-bold text-white">
            {invite.copyLabel}
          </button>
        </div>
      </section>

      <section className="mt-2.5">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">쓰는 법</h2>
        <ol className="mt-1.5 grid gap-1">
          {howTo.map((line, i) => (
            <li key={line} className="flex items-baseline gap-2 rounded-card border border-line bg-surface px-3 py-2">
              <span className="text-[0.78em] tabular-nums text-ink-mute">{i + 1}</span>
              <span className="flex-1 text-[0.84em] leading-relaxed text-ink-soft">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-2.5">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{noCredentialNotice.title}</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{noCredentialNotice.body}</p>
        </Card>
      </div>

      <section className="mt-2.5">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">등록 규칙</h2>
        <dl className="mt-1.5 grid gap-1">
          {rules.map((r) => (
            <div key={r.k} className="flex items-baseline justify-between gap-3 rounded-card border border-line bg-surface px-3 py-2">
              <dt className="shrink-0 text-[0.8em] text-ink-mute">{r.k}</dt>
              <dd className="text-right text-[0.84em] text-ink-soft">{r.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Link
        href={previewLink.href}
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card border border-line-2 text-[0.86em] text-ink-soft"
      >
        {previewLink.label}
      </Link>
    </Screen>
  );
}
