import { Screen, Card } from "@/components/shared/Screen";
import { spending, notice } from "./spending.fixture";

// PLN-005 — 소비 내역. 전월 대비 증감액을 맨 위에 둔다
export const metadata = { title: "소비 내역 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function ParentSpendingPage() {
  const diff = spending.total - spending.prevTotal;
  const down = diff < 0;

  return (
    <Screen role="부모 화면" title="소비 내역" sub={`${spending.monthLabel} · 서연`}>
      <div className="rounded-card border border-line-2 bg-sand p-3 text-center">
        <span className="block text-[0.72em] text-ink-mute">지난달보다</span>
        <b className={`text-[1.5em] tabular-nums ${down ? "text-primary-d" : "text-miss"}`}>
          {down ? "−" : "+"}{won(Math.abs(diff))}
        </b>
        <span className="mt-0.5 block text-[0.76em] text-ink-soft">
          {won(spending.prevTotal)} → {won(spending.total)}
        </span>
      </div>

      <h2 className="mb-1.5 mt-3 text-[0.76em] tracking-[0.04em] text-ink-mute">업종별</h2>
      <ul className="grid gap-1.5">
        {spending.byTopic.map((l) => (
          <li key={l.label} className="flex items-center justify-between rounded-card border border-line bg-surface px-3 py-2 text-[0.86em]">
            <span>{l.icon} {l.label}</span>
            <span className="flex items-baseline gap-2">
              {!l.planned ? <span className="text-[0.72em] text-miss">계획에 없던 업종</span> : null}
              <b className="tabular-nums">{won(l.amount)}</b>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[0.72em] leading-relaxed text-ink-mute">
        {notice}
      </p>
    </Screen>
  );
}
