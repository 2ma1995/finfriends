import { Screen, Card } from "@/components/shared/Screen";
import { draft, topics, notice } from "./plan.fixture";

// PLN-001 · PLN-004 — 계획 카드 적기
export const metadata = { title: "계획 카드 · 핀프렌즈" };
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function ChildPlanNewPage() {
  return (
    <Screen role="아이 화면" title="계획 카드 적기" back={{ href: "/child/home", label: "내 방" }}>
      <Card tone="grow"><p className="text-[0.88em] leading-relaxed">{notice}</p></Card>

      <div className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">어디서</span>
          <div className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.92em] leading-[44px]">{draft.where}</div>
        </label>

        <div className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">무엇을</span>
          <ul className="grid grid-cols-4 gap-1.5">
            {topics.map((t) => (
              <li key={t.label}>
                <button className={`min-h-touch w-full rounded-card border text-center text-[0.72em] ${
                  t.label === draft.topic.label ? "border-primary-l bg-primary-bg font-bold" : "border-line bg-surface"}`}>
                  <span className="block text-[1.3em]">{t.icon}</span>{t.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label className="grid gap-1">
          <span className="text-[0.76em] text-ink-mute">얼마를</span>
          <div className="min-h-touch rounded-card border border-line bg-surface px-3 text-right text-title font-bold tabular-nums leading-[44px]">
            {won(draft.amount)}
          </div>
        </label>
      </div>

      <button className="mt-3 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">적어두기</button>
      <p className="mt-2 text-center text-[0.74em] text-ink-mute">적은 사람: {draft.writtenBy}</p>
    </Screen>
  );
}
