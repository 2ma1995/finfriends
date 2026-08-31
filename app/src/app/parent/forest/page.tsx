import { Screen, Card, Empty } from "@/components/shared/Screen";
import { forest } from "./forest.fixture";

// GRW-005 · UX-002 · REQ-FUNC-009 — 월말 기록
export const metadata = { title: "월간 숲 · 핀프렌즈" };

export default function ParentForestPage() {
  return (
    <Screen role="부모 화면 · 월말 기록" title={forest.title} sub={forest.childName} back={{ href: "/", label: "화면 목록" }}>
      {/* ① 한 줄 요약 */}
      <div className="rounded-card border border-line-2 bg-sand p-3 text-center">
        <span className="block text-[0.72em] tracking-[0.1em] text-ink-mute">이번 달 한 줄</span>
        <b className="ff-serif text-[1.05em]">{forest.oneLine}</b>
      </div>

      {/* ② 획득 별 — 스크롤 없이 (AC-1.4) */}
      <div className="mt-2 rounded-card border border-star p-3 text-center"
           style={{ background: "linear-gradient(180deg, var(--ff-star-bg), var(--ff-star-bg-2))" }}>
        <b className="block text-[1.7em] tabular-nums text-star-d">{forest.starsEarned}</b>
        <span className="text-[0.78em] text-ink-soft">이번 달 획득 별</span>
      </div>

      {/* ③④ 델타 */}
      <h2 className="mb-1.5 mt-3 text-[0.76em] tracking-[0.04em] text-ink-mute">지난달과 비교</h2>
      {forest.noPrevMonth ? (
        <Empty emoji="📅" {...forest.noPrevNotice} />
      ) : (
        <ul className="grid gap-1.5">
          {forest.deltas.map((d) => (
            <li key={d.label} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2 text-[0.84em]">
              <span>{d.label}</span>
              <span className={`font-bold tabular-nums ${d.improved ? "text-primary-d" : ""}`}>{d.from} → {d.to}</span>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
