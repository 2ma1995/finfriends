import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { findChild } from "@/modules/consent";
import { getForestView } from "@/modules/growth";
import { currentGuardian } from "@/lib/session/guardian-session";
import { emptyState, noPrevNotice, snapshotNotice } from "./forest.fixture";

// GRW-005 · UX-002 · REQ-FUNC-009 — 월말 기록
export const metadata = { title: "월간 숲 · 핀프렌즈" };

export default async function ParentForestPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면 · 월말 기록" title="월간 숲">
        <Empty
          emoji="🐣"
          title="아직 등록한 아이가 없어요"
          body="아이 프로필을 만들면 달마다 기록이 쌓입니다."
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

  const view = await getForestView(child.id, child.displayName);

  return (
    <Screen role="부모 화면 · 월말 기록" title={`${view.monthLabel} 숲`} sub={view.childName}>
      {/*
        ② 획득 별 — 🔴 스크롤 없이 (AC-1.4).
           별을 즉시 소진하는 아이에게 **유일한 누적 증거**다. 그래서 맨 위에 둔다.
           잔액이 아니라 「이번 달 번 별」이다 — 잔액이 0이어도 번 것은 남는다.
      */}
      <div
        className="rounded-card border border-star p-3 text-center"
        style={{ background: "linear-gradient(180deg, var(--ff-star-bg), var(--ff-star-bg-2))" }}
      >
        <b className="block text-hero tabular-nums text-star-d">{view.starsEarned}</b>
        <span className="text-sub text-ink-soft">이번 달 획득 별</span>
        {view.starsSpent > 0 ? (
          <p className="mt-1 text-cap text-ink-mute">
            이 중 {view.starsSpent}개를 방 아이템으로 바꿨어요
          </p>
        ) : null}
      </div>

      {view.noActivity ? (
        <div className="mt-2">
          <Empty emoji={emptyState.emoji} title={emptyState.title} body={emptyState.body} hint={emptyState.hint} />
        </div>
      ) : (
        <section className="mt-3">
          <h2 className="mb-1.5 text-cap tracking-[0.04em] text-ink-mute">이번 달 네 영역</h2>
          <ul className="grid grid-cols-2 gap-1.5">
            {view.slotStages.map((s) => (
              <li key={s.label} className="flex items-baseline justify-between rounded-card border border-line bg-surface px-3 py-2 text-sub">
                <span>{s.label}</span>
                <b className="text-ink-soft">{s.stage}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        ③④ 지난달과 비교 — 🔴 전월 스냅샷이 없으면 **0으로 그리지 않는다** (AC-E2).
            0으로 그리면 보호자는 「변화 없음」이 아니라 「고장」으로 읽는다.
      */}
      <h2 className="mb-1.5 mt-3 text-cap tracking-[0.04em] text-ink-mute">지난달과 비교</h2>
      {view.hasPrevMonth && view.deltas.length > 0 ? (
        <ul className="grid gap-1.5">
          {view.deltas.map((d) => (
            <li key={d.label} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2 text-sub">
              <span>{d.label}</span>
              <span className={`font-bold tabular-nums ${d.improved ? "text-primary-d" : ""}`}>
                {d.from} → {d.to}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty emoji="📅" title={noPrevNotice.title} body={noPrevNotice.body} hint={noPrevNotice.hint} />
      )}

      <div className="mt-3">
        <Card>
          <h2 className="text-cap tracking-[0.03em] text-ink-mute">{snapshotNotice.title}</h2>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{snapshotNotice.body}</p>
        </Card>
      </div>
    </Screen>
  );
}
