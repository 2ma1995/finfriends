import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { TreeArt } from "@/components/parent/TreeArt";
import { STAGE_LABEL, type Condition, type TreeSlotView } from "@/contracts/growth";
import { findChild } from "@/modules/consent";
import { getTreeView } from "@/modules/growth";
import { currentGuardian } from "@/lib/session/guardian-session";
import { emptyState, engineNotice, stageNotice } from "./tree.fixture";

// GRW-003 · UX-002 · REQ-FUNC-001 — 보호자가 여는 첫 화면
export const metadata = { title: "성장 나무 · 핀프렌즈" };

function Gauge({ c }: { c: Condition }) {
  const done = c.current >= c.required;
  const pct = Math.min(100, Math.round((c.current / c.required) * 100));
  return (
    <li>
      <div className="flex items-baseline justify-between text-[0.72em]">
        <span className="text-ink-soft">{c.label}</span>
        <span className="tabular-nums text-ink-mute">{c.current}/{c.required}</span>
      </div>
      <div className="mt-0.5 h-[5px] overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? "var(--ff-primary-l)" : "var(--ff-miss-line)" }} />
      </div>
    </li>
  );
}

function TreeCard({ t }: { t: TreeSlotView }) {
  return (
    <div className={`rounded-card border p-2.5 text-center ${t.stalledDays ? "border-miss-line bg-miss-bg" : "border-line bg-surface"}`}>
      <TreeArt stage={t.stage} icon={t.icon} />
      <div className="mt-1 text-[0.82em] font-bold">{t.label}</div>
      <div className="text-[0.7em] text-ink-mute">
        {t.locked ? "곧 열려요" : t.stalledDays ? `${t.stalledDays}일째 그대로` : STAGE_LABEL[t.stage]}
      </div>
      <ul className="mt-2 grid gap-1 text-left">{t.conditions.map((c) => <Gauge key={c.label} c={c} />)}</ul>
    </div>
  );
}

export default async function ParentTreePage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  // 🔴 아이가 없으면 볼 나무도 없다. 남의 예시 데이터를 보여주지 않는다
  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title="성장 나무" back={{ href: "/parent/onboarding", label: "시작하기" }}>
        <Empty
          emoji="🐣"
          title="아직 등록한 아이가 없어요"
          body="아이 프로필을 만들면 네 영역의 나무가 함께 생깁니다."
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

  const view = await getTreeView(child.id, child.displayName);

  return (
    <Screen role="부모 화면" title="성장 나무" sub={`${view.childName} · ${view.cycleLabel}`} back={{ href: "/parent/onboarding", label: "시작하기" }}>
      {/*
        🔴 US-1 AC-E1 — 실천 0건이면 0으로 그리지 않는다.
           0% 로 그리면 보호자는 「변화가 없다」가 아니라 「고장났다」로 읽는다.
      */}
      {view.noActivity ? (
        <Empty emoji={emptyState.emoji} title={emptyState.title} body={emptyState.body} hint={emptyState.hint} />
      ) : (
        /* ② 4영역 2×2 — 순서를 바꾸지 않는다 (명세 §2.1) */
        <div className="grid grid-cols-2 gap-2">
          {view.slots.map((t) => <TreeCard key={t.topic} t={t} />)}
        </div>
      )}

      {/* ④ 승인 대기 — 조건부. 없으면 자리도 없다 */}
      {view.pendingApprovals > 0 ? (
        <Link href="/parent/missions" className="mt-2 flex items-center justify-between rounded-card border border-line-2 bg-sand px-3 py-2 text-[0.82em] text-ink-soft">
          <span>승인을 기다리는 미션</span>
          <b className="text-miss">{view.pendingApprovals}건 →</b>
        </Link>
      ) : null}

      {/*
        ⑤ 실천 근거 — 접지 않는다 (AC-1.2).
        🔴 지금은 근거를 만들 엔진(GRW-001)이 없다. 문장을 지어내지 않고 그 사실을 적는다.
      */}
      <div className="mt-3">
        <Card>
          <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">{engineNotice.title}</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{engineNotice.body}</p>
        </Card>
      </div>

      <p className="mt-3 text-[0.68em] leading-relaxed text-ink-mute">{stageNotice}</p>
    </Screen>
  );
}
