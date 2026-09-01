import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { TreeArt } from "@/components/parent/TreeArt";
import { STAGE_LABEL, type Condition, type TreeSlotView } from "@/contracts/growth";
import { findChild } from "@/modules/consent";
import { getTreeView } from "@/modules/growth";
import { countUnread } from "@/modules/mission";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  alertsLabel, cycleNotice, emptyState, engineNotice, quarantineNotice, stageNotice,
  stallNotice,
} from "./tree.fixture";

// GRW-003 · UX-002 · REQ-FUNC-001 — 보호자가 여는 첫 화면
export const metadata = { title: "성장 나무 · 핀프렌즈" };

function Gauge({ c }: { c: Condition }) {
  const done = c.current >= c.required;
  const pct = Math.min(100, Math.round((c.current / c.required) * 100));
  return (
    <li>
      <div className="flex items-baseline justify-between text-cap">
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
      <div className="mt-1 text-sub font-bold">{t.label}</div>
      <div className="text-cap text-ink-mute">
        {t.locked ? "곧 열려요" : t.stalledDays ? `${t.stalledDays}일째 그대로` : STAGE_LABEL[t.stage]}
      </div>
      {!t.locked && t.nextStageLabel ? (
        <div className="text-micro text-ink-mute">{t.nextStageLabel}</div>
      ) : null}
      <ul className="mt-2 grid gap-1 text-left">{t.conditions.map((c) => <Gauge key={c.label} c={c} />)}</ul>
      {/*
        🔴 **무엇이 모자라서 안 올랐는지 말한다** (`AC-030-2`).
           게이지만 보여주면 부모는 세 숫자를 읽고 **스스로 비교해야** 한다 —
           그건 「증거를 제시하고 판단을 돕는다」가 아니다.

        🔴 잠긴 칸에는 안 적는다. 열리지도 않은 것에 「남았어요」는 말이 안 된다.
      */}
      {!t.locked && t.blockedBy ? (
        <p className="mt-1.5 text-left text-[0.66em] leading-relaxed text-ink-soft">{t.blockedBy}</p>
      ) : null}
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
      <Screen role="부모 화면" title="성장 나무">
        <Empty
          emoji="🐣"
          title="아직 등록한 아이가 없어요"
          body="아이 프로필을 만들면 네 영역의 나무가 함께 생깁니다."
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

  const [view, unread] = await Promise.all([
    getTreeView(child.id, child.displayName),
    countUnread(guardian.guardianId),
  ]);

  return (
    <Screen role="부모 화면" title="성장 나무" sub={`${view.childName} · ${view.cycleLabel}`}>
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
        <Link href="/parent/bank/missions" className="mt-2 flex items-center justify-between rounded-card border border-line-2 bg-sand px-3 py-2 text-sub text-ink-soft">
          <span>승인을 기다리는 미션</span>
          <b className="text-miss">{view.pendingApprovals}건 →</b>
        </Link>
      ) : null}

      {/*
        미션 — 나무가 안 자란 것을 본 부모가 할 수 있는 **다음 행동**이다.
        US-3 AC3 이 「정체 원인을 본 뒤 다음 주 재방문」을 요구하는데,
        볼 것만 주고 할 것을 주지 않으면 재방문할 이유가 없다.
      */}
      <Link
        href="/parent/bank/missions/new"
        className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-sub font-bold text-white"
      >
        미션 만들기
      </Link>

      {/*
        ⑤ 실천 근거 — 접지 않는다 (AC-1.2).
        🔴 지금은 근거를 만들 엔진(GRW-001)이 없다. 문장을 지어내지 않고 그 사실을 적는다.
      */}
      <div className="mt-3">
        <Card>
          <h2 className="text-cap tracking-[0.03em] text-ink-mute">{engineNotice.title}</h2>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{engineNotice.body}</p>
        </Card>
      </div>

      {/*
        🔴 **안 읽은 알림이 있을 때만 보인다.** 0이면 자리도 없다 —
           빈 배지를 늘 띄우면 아무도 안 본다.
        🔴 알림은 앱 안에서만 보인다(D51). 부모가 이 화면을 열어야 알게 되므로
           **첫 화면 맨 위**가 그 자리다.
      */}
      {unread > 0 ? (
        <Link
          href="/parent/alerts"
          className="mb-2 flex min-h-touch items-center justify-between rounded-card border border-primary-l bg-primary-bg px-3 text-sub font-bold text-primary-d"
        >
          <span>🔔 {alertsLabel(unread)}</span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}


      {/* 🔴 정합성이 깨진 줄이 있으면 숨기지 않는다 (AC-012-3) */}
      {view.quarantinedStars > 0 ? (
        <p className="mt-3 rounded-card border border-dashed border-line-2 px-3 py-2 text-cap leading-relaxed text-ink-soft">
          {quarantineNotice(view.quarantinedStars)}
        </p>
      ) : null}

      {/*
        🔴 정체가 있으면 말한다 — 다만 **다그치지 않는다.**
           「14일째 그대로」만 있으면 부모는 아이를 재촉한다.
           무엇이 남았는지가 카드마다 적혀 있으니 거기를 가리킨다.
      */}
      {view.slots.some((s) => s.stalledDays !== null) ? (
        <p className="mt-3 rounded-card border border-dashed border-line-2 px-3 py-2 text-[0.78em] leading-relaxed text-ink-soft">
          {stallNotice}
        </p>
      ) : null}

      {/* 🔴 매달 실천만 비워지는 이유를 적는다 — 안 적으면 「쉽게 올랐다」로 읽힌다 */}
      <p className="mt-3 text-micro leading-relaxed text-ink-mute">{cycleNotice}</p>
      <p className="mt-1 text-micro leading-relaxed text-ink-mute">{stageNotice}</p>
    </Screen>
  );
}
