import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Empty } from "@/components/shared/Screen";
import { findChild } from "@/modules/consent";
import { getSpendSummary } from "@/modules/plan";
import type { SpendRecordView } from "@/contracts/plan";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  emptyState, monthEmpty, noPrevNotice, notice, noPlanNotice,
  prevRecordsTitle, recordsNotice, recordsTitle, seedNotice,
} from "./spending.fixture";

// PLN-005 — 소비 내역. 전월 대비 증감액을 맨 위에 둔다
export const metadata = { title: "소비 내역 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

/** 소비 한 줄. 🔴 **이번 달과 지난달이 같은 모양이어야 한다** — 따로 쓰면 한쪽만 고쳐진다 */
function SpendRow({ r }: { r: SpendRecordView }) {
  return (
    <li className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
      <span aria-hidden className="shrink-0 text-[1.1em]">{r.icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sub font-medium">{r.categoryLabel}</b>
        <span className="block text-cap text-ink-mute">{r.dayLabel} · {r.planNote}</span>
      </span>
      <b className="shrink-0 tabular-nums text-sub">{won(r.amount)}</b>
    </li>
  );
}

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
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  const view = await getSpendSummary(child.id);

  if (view.recordCount === 0) {
    /**
     * 🔴 **한 번도 없는 것과, 이번 달만 없는 것은 다르다.**
     *    구별하지 않으면 매달 1일에 「기록이 안 됐다」로 읽힌다 — 실제로 그랬다.
     */
    const e = view.prevRecords.length > 0 ? monthEmpty : emptyState;
    return (
      <Screen role="부모 화면" title="소비 내역" sub={`${view.monthLabel} · ${child.displayName}`}>
        <Empty emoji={e.emoji} title={e.title} body={e.body} hint={e.hint} />
        {view.prevRecords.length > 0 ? (
          <>
            <h2 className="mb-1.5 mt-4 text-cap tracking-[0.06em] text-ink-mute">{prevRecordsTitle}</h2>
            <ul className="grid gap-1">
              {view.prevRecords.map((r) => (
                <SpendRow key={r.id} r={r} />
              ))}
            </ul>
            <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{recordsNotice}</p>
          </>
        ) : null}
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
          <span className="block text-cap text-ink-mute">지난달보다</span>
          <b className={`text-hero tabular-nums ${down ? "text-primary-d" : "text-miss"}`}>
            {down ? "−" : "+"}
            {won(Math.abs(view.delta))}
          </b>
          <span className="mt-0.5 block text-cap text-ink-soft">
            {won(view.prevTotal)} → {won(view.total)}
          </span>
        </div>
      ) : (
        <div className="rounded-card border border-line-2 bg-sand p-3 text-center">
          <b className="text-hero tabular-nums">{won(view.total)}</b>
          <span className="mt-0.5 block text-cap text-ink-soft">{noPrevNotice}</span>
        </div>
      )}

      <h2 className="mb-1.5 mt-3 text-cap tracking-[0.04em] text-ink-mute">업종별</h2>
      <ul className="grid gap-1.5">
        {view.byCategory.map((l) => (
          <li key={l.label} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2 text-sub">
            <span>
              {l.icon} {l.label}
            </span>
            <span className="flex items-baseline gap-2">
              {l.unplanned ? <span className="text-cap text-miss">계획에 없던 업종</span> : null}
              <b className="tabular-nums">{won(l.amount)}</b>
            </span>
          </li>
        ))}
      </ul>

      {/* 🔴 계획 없이 나간 소비 = C5 사각지대. 크기를 숨기지 않는다 */}
      {view.noPlanCount > 0 ? (
        <p className="mt-2 rounded-card border border-dashed border-line-2 px-3 py-2 text-sub leading-relaxed text-ink-soft">
          {noPlanNotice(view.noPlanCount)}
        </p>
      ) : null}

      {/*
        ── 건별 내역 ──
        🔴 집계만 있으면 「소비 내역」이라는 이름이 거짓이 된다. 부모는 합계를 보고도
           무엇을 샀는지 알 수 없었다 (어긋남 대장 D26).
        🔴 「계획 없이」를 색으로 가르지 않는다. ⭐ 판정은 금액 단독이고(ADR-008)
           경고색을 쓰면 다그치는 화면이 된다 (P-03).
      */}
      <h2 className="mb-1.5 mt-4 text-cap tracking-[0.06em] text-ink-mute">{recordsTitle}</h2>
      <ul className="grid gap-1">
        {view.records.map((r) => (
          <SpendRow key={r.id} r={r} />
        ))}
      </ul>
      <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{recordsNotice}</p>
      <p className="mt-1 text-cap leading-relaxed text-ink-mute">{seedNotice}</p>

      <p className="mt-3 text-cap leading-relaxed text-ink-mute">{notice}</p>
    </Screen>
  );
}
