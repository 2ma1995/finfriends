import Link from "next/link";
import { Screen } from "@/components/shared/Screen";
import { steps, reassurance } from "./onboarding.fixture";

// CON-003 — 보호자 온보딩 6단계 (4단계 자녀 초대는 SRS 다이어그램 A의 P4 · 원장 T17)
export const metadata = { title: "시작하기 · 핀프렌즈" };

export default function ParentOnboardingPage() {
  const current = steps.find((s) => s.state === "current");

  return (
    <Screen role="부모 화면" title="시작하기" sub={`${steps.filter((s) => s.state === "done").length} / ${steps.length}단계`} back={{ href: "/screens", label: "화면 목록" }}>
      <ol className="grid gap-1.5">
        {steps.map((s) => (
          <li key={s.n}
              className={`rounded-card border p-3 ${
                s.state === "current" ? "border-primary-l bg-primary-bg"
                : s.state === "done" ? "border-line bg-surface"
                : "border-dashed border-line-2 bg-transparent"}`}>
            <div className="flex items-baseline gap-2">
              <span className={`text-[0.78em] tabular-nums ${s.state === "done" ? "text-primary-d" : "text-ink-mute"}`}>
                {s.state === "done" ? "✓" : s.n}
              </span>
              <b className={`text-[0.9em] ${s.state === "todo" ? "text-ink-mute" : ""}`}>{s.title}</b>
            </div>
            <p className={`mt-0.5 pl-5 text-[0.8em] ${s.state === "todo" ? "text-ink-mute" : "text-ink-soft"}`}>{s.body}</p>
          </li>
        ))}
      </ol>

      {current?.href ? (
        <Link
          href={current.href}
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          {current.n}단계 이어서 하기
        </Link>
      ) : current ? (
        <button className="mt-3 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">
          {current.n}단계 이어서 하기
        </button>
      ) : null}

      <p className="mt-2 text-center text-[0.76em] leading-relaxed text-ink-soft">{reassurance}</p>
    </Screen>
  );
}
