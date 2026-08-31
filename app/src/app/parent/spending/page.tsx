import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Empty } from "@/components/shared/Screen";
import { findChild } from "@/modules/consent";
import { getSpendSummary } from "@/modules/plan";
import { currentGuardian } from "@/lib/session/guardian-session";
import { emptyState, noPrevNotice, notice, noPlanNotice } from "./spending.fixture";

// PLN-005 — 소비 내역. 전월 대비 증감액을 맨 위에 둔다
export const metadata = { title: "소비 내역 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ParentSpendingPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title="소비 내역">
        <Empty
          emoji="🐣"
          title="아직 등록한 아이가 없어요"
          body="아이 프로필을 만들고 카드를 연결하면 소비가 여기에 쌓입니다."
          hint="온보딩 3단계 · 아이 프로필"
        />
        <Link
          href="/parent/child/new"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  const view = await getSpendSummary(child.id);

  if (view.recordCount === 0) {
    return (
      <Screen role="부모 화면" title="소비 내역" sub={`${view.monthLabel} · ${child.displayName}`}>
        <Empty emoji={emptyState.emoji} title={emptyState.title} body={emptyState.body} hint={emptyState.hint} />
      </Screen>
    );
  }

  const down = view.delta < 0;

  return (
    <Screen role="부모 화면" title="소비 내역" sub={`${view.monthLabel} · ${child.displayName}`}>
      {/*
        🔴 전월 대비 증감액이 상단이다 (PLN-005). 이 화면의 목적은 「얼마 썼나」가 아니라
           「지난달과 무엇이 달라졌나」다. 지난달 기록이 없으면 증감을 0으로 그리지 않는다.
      */}
      {view.hasPrevMonth ? (
        <div className="rounded-card border border-line-2 bg-sand p-3 text-center">
          <span className="block text-[0.72em] text-ink-mute">지난달보다</span>
          <b className={`text-[1.5em] tabular-nums ${down ? "text-primary-d" : "text-miss"}`}>
            {down ? "−" : "+"}
            {won(Math.abs(view.delta))}
          </b>
          <span className="mt-0.5 block text-[0.76em] text-ink-soft">
            {won(view.prevTotal)} → {won(view.total)}
          </span>
        </div>
      ) : (
        <div className="rounded-card border border-line-2 bg-sand p-3 text-center">
          <b className="text-[1.5em] tabular-nums">{won(view.total)}</b>
          <span className="mt-0.5 block text-[0.76em] text-ink-soft">{noPrevNotice}</span>
        </div>
      )}

      <h2 className="mb-1.5 mt-3 text-[0.76em] tracking-[0.04em] text-ink-mute">업종별</h2>
      <ul className="grid gap-1.5">
        {view.byCategory.map((l) => (
          <li key={l.label} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2 text-[0.86em]">
            <span>
              {l.icon} {l.label}
            </span>
            <span className="flex items-baseline gap-2">
              {l.unplanned ? <span className="text-[0.72em] text-miss">계획에 없던 업종</span> : null}
              <b className="tabular-nums">{won(l.amount)}</b>
            </span>
          </li>
        ))}
      </ul>

      {/* 🔴 계획 없이 나간 소비 = C5 사각지대. 크기를 숨기지 않는다 */}
      {view.noPlanCount > 0 ? (
        <p className="mt-2 rounded-card border border-dashed border-line-2 px-3 py-2 text-[0.78em] leading-relaxed text-ink-soft">
          {noPlanNotice(view.noPlanCount)}
        </p>
      ) : null}

      <p className="mt-3 text-[0.72em] leading-relaxed text-ink-mute">{notice}</p>
    </Screen>
  );
}
