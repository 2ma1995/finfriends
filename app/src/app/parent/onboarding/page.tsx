import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen } from "@/components/shared/Screen";
import { readOnboardingProgress } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import { buildSteps, reassurance } from "./onboarding.fixture";

// CON-003 — 보호자 온보딩 6단계 (4단계 자녀 초대는 SRS 다이어그램 A의 P4 · 원장 T17)
export const metadata = { title: "시작하기 · 핀프렌즈" };

export default async function ParentOnboardingPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  // 🔴 단계 상태를 화면이 정하지 않는다. 하드코딩하면 화면은 「완료」인데 DB 는 비어 있게 된다
  const progress = await readOnboardingProgress(guardian.guardianId);
  const steps = buildSteps(progress);
  const done = steps.filter((s) => s.state === "done").length;
  const current = steps.find((s) => s.state === "current");

  return (
    <Screen role="부모 화면" title="시작하기" sub={`${done} / ${steps.length}단계`} back={{ href: "/screens", label: "화면 목록" }}>
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
              {s.state === "done" && s.href ? (
                <Link href={s.href} className="ml-auto text-[0.72em] text-ink-mute underline underline-offset-2">
                  보기
                </Link>
              ) : null}
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
      ) : (
        <Link
          href="/parent/tree"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          성장 나무 보기
        </Link>
      )}

      <p className="mt-2 text-center text-[0.76em] leading-relaxed text-ink-soft">{reassurance}</p>
    </Screen>
  );
}
