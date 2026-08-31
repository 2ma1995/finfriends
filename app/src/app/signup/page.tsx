import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fields, resumeNotice, childAccountNotice, nextSteps, nextLabel, loginPrompt } from "./signup.fixture";

// CON-001 — 보호자 계정 만들기. 온보딩 5단계 중 1단계
export const metadata = { title: "계정 만들기 · 핀프렌즈" };

export default function SignupPage() {
  return (
    <Screen role="부모 화면" title="계정 만들기" sub="1 / 5단계" back={{ href: "/", label: "화면 목록" }}>
      <div className="grid gap-2.5">
        {fields.map((f) => (
          <div key={f.key} className="grid gap-1">
            <Label htmlFor={f.key} className="text-[0.8em] font-normal text-ink-soft">
              {f.label}
            </Label>
            <Input
              id={f.key}
              name={f.key}
              type={f.type}
              placeholder={f.placeholder}
              autoComplete={f.type === "email" ? "email" : "new-password"}
              className="min-h-touch rounded-card border-line bg-surface px-3 text-[0.9em] text-ink placeholder:text-ink-mute"
            />
            {f.hint ? <small className="text-[0.74em] leading-relaxed text-ink-mute">{f.hint}</small> : null}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{childAccountNotice.title}</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{childAccountNotice.body}</p>
        </Card>
      </div>

      <Link
        href="/consent"
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
      >
        {nextLabel}
      </Link>
      <p className="mt-2 text-center text-[0.76em] leading-relaxed text-ink-soft">{resumeNotice}</p>

      <section className="mt-4">
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">남은 단계</h2>
        <ol className="mt-1.5 grid gap-1">
          {nextSteps.map((s) => (
            <li key={s.n} className="flex items-baseline gap-2 rounded-card border border-dashed border-line-2 px-3 py-2">
              <span className="text-[0.78em] tabular-nums text-ink-mute">{s.n}</span>
              <span className="flex-1 text-[0.82em] leading-relaxed text-ink-soft">
                <b className="text-ink">{s.title}</b>
                {s.undecided ? <b className="ml-1 text-[0.82em] font-normal text-miss">방식 미정</b> : null}
                <br />
                {s.body}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-4 text-center text-[0.82em] text-ink-soft">
        {loginPrompt.question}{" "}
        <Link href={loginPrompt.href} className="font-bold text-primary-d underline underline-offset-2">
          {loginPrompt.label}
        </Link>
      </p>
    </Screen>
  );
}
