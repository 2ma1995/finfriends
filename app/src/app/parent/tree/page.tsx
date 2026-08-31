import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { TreeArt } from "@/components/parent/TreeArt";
import { InactivityBanner } from "@/components/parent/InactivityBanner";
import { trees, child, evidence, pendingCount, stallReassurance, STAGE_LABEL, type Tree, type Condition } from "./tree.fixture";

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

function TreeCard({ t }: { t: Tree }) {
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

export default function ParentTreePage() {
  const stalled = trees.find((t) => t.stalledDays);

  return (
    <Screen role="부모 화면" title="성장 나무" sub={`${child.name} · ${child.cycleLabel}`} back={{ href: "/", label: "화면 목록" }}>
      {/* ② 4영역 2×2 — 순서를 바꾸지 않는다 (명세 §2.1) */}
      <div className="grid grid-cols-2 gap-2">
        {trees.map((t) => <TreeCard key={t.id} t={t} />)}
      </div>

      {/* ③ 정체 원인 — 미충족 조건 전부, 가장 적게 남은 것이 최상단 (ACE-3.1) */}
      {stalled ? (
        <div className="mt-2">
          <Card tone="miss">
            <h2 className="text-[0.78em] font-bold text-miss">🛑 「{stalled.label}」가 {stalled.stalledDays}일째 그대로예요</h2>
            <ol className="mt-1 list-decimal pl-4 text-[0.82em] leading-relaxed text-ink-soft">
              {[...stalled.conditions]
                .filter((c) => c.current < c.required)
                .sort((a, b) => (a.required - a.current) - (b.required - b.current))
                .map((c, i) => (
                  <li key={c.label} className={i === 0 ? "font-bold text-ink" : undefined}>
                    {c.label} {c.required - c.current}회가 남았어요
                  </li>
                ))}
              <li>학습·퀴즈는 이미 충족했어요</li>
            </ol>
          </Card>
        </div>
      ) : null}

      {/* ③-b 정체는 조건의 문제다 — 아이 탓으로 읽히지 않게 (AC-3.2) */}
      {stalled ? (
        <div className="mt-2">
          <InactivityBanner {...stallReassurance} days={stalled.stalledDays!} />
        </div>
      ) : null}

      {/* ④ 승인 대기 — 조건부. 없으면 자리도 없다 */}
      {pendingCount > 0 ? (
        <Link href="/parent/missions" className="mt-2 flex items-center justify-between rounded-card border border-line-2 bg-sand px-3 py-2 text-[0.82em] text-ink-soft">
          <span>승인을 기다리는 미션</span>
          <b className="text-miss">{pendingCount}건 →</b>
        </Link>
      ) : null}

      {/* ⑤ 실천 근거 — 접지 않는다 (AC-1.2) */}
      <div className="mt-3">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{evidence.title}</h2>
          <p className="mt-1 text-[0.9em] leading-relaxed">
            {evidence.lines.map((l) => <span key={l} className="block">{l}</span>)}
          </p>
        </Card>
      </div>

      <p className="mt-3 text-[0.68em] text-ink-mute">나무 단계 수는 예시값입니다 · 미확정 사양(D6)</p>
    </Screen>
  );
}
