import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen } from "@/components/shared/Screen";
import { readOnboardingProgress } from "@/modules/consent";
import { currentGuardian } from "@/lib/session/guardian-session";
import { allDoneNotice, buildSteps, plannedNotice, readyForChild, reassurance, readyNotice } from "./onboarding.fixture";

// CON-003 — 보호자 온보딩 6단계 (4단계 자녀 초대는 SRS 다이어그램 A의 P4 · 원장 T17)
export const metadata = { title: "시작하기 · 핀프렌즈" };

export default async function ParentOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ planned?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const sp = await searchParams;

  // 🔴 단계 상태를 화면이 정하지 않는다. 하드코딩하면 화면은 「완료」인데 DB 는 비어 있게 된다
  const progress = await readOnboardingProgress(guardian.guardianId);
  const steps = buildSteps(progress);
  const done = steps.filter((s) => s.state === "done").length;
  const current = steps.find((s) => s.state === "current");
  const ready = readyForChild(steps);
  // 🔴 여섯 단계가 다 끝났으면 **다음 로그인부터 나무로 간다** — 그 사실을 여기서 말한다 (D43)
  const allDone = done === steps.length;

  return (
    <Screen role="부모 화면" title="시작하기" sub={`${done} / ${steps.length}단계`} back={{ href: "/parent/tree", label: "성장 나무" }}>
      {/* 🔴 적었을 때만 말한다. 매번 띄우면 무시하게 된다 */}
      {sp.planned ? (
        <p className="mb-2 rounded-card border border-primary-l bg-primary-bg px-3 py-2 text-center text-sub font-bold text-primary-d">
          {plannedNotice}
        </p>
      ) : null}

      <ol className="grid gap-1.5">
        {steps.map((s) => (
          <li key={s.n}
              className={`rounded-card border p-3 ${
                s.state === "current" ? "border-primary-l bg-primary-bg"
                : s.state === "done" ? "border-line bg-surface"
                : "border-dashed border-line-2 bg-transparent"}`}>
            <div className="flex items-baseline gap-2">
              <span className={`text-sub tabular-nums ${s.state === "done" ? "text-primary-d" : "text-ink-mute"}`}>
                {s.state === "done" ? "✓" : s.n}
              </span>
              <b className={`text-body ${s.state === "todo" ? "text-ink-mute" : ""}`}>{s.title}</b>
              {/* 화면이 없는 단계는 그렇다고 적는다. 눌러도 안 되는 것을 눌러 보게 하지 않는다 */}
              {!s.href ? (
                <span className="text-cap text-ink-mute">준비 중</span>
              ) : s.state === "done" ? (
                <Link href={s.href} className="ml-auto text-cap text-ink-mute underline underline-offset-2">
                  보기
                </Link>
              ) : null}
            </div>
            <p className={`mt-0.5 pl-5 text-sub ${s.state === "todo" ? "text-ink-mute" : "text-ink-soft"}`}>{s.body}</p>
          </li>
        ))}
      </ol>

      {/*
        🔴 갈 곳이 없으면 버튼을 그리지 않는다.
           5·6단계는 부모 화면이 아직 없어서, 예전 코드는 아무 일도 하지 않는 버튼을 그렸다.
           필수 4단계가 끝났다면 부모가 갈 곳은 성장 나무다.
      */}
      {current?.href ? (
        <Link
          href={current.href}
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          {current.n}단계 이어서 하기
        </Link>
      ) : ready ? (
        <Link
          href="/parent/tree"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          성장 나무 보기
        </Link>
      ) : null}

      <p className="mt-2 text-center text-cap leading-relaxed text-ink-soft">
        {allDone ? allDoneNotice : ready ? readyNotice : reassurance}
      </p>
    </Screen>
  );
}
