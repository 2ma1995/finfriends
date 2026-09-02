import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/app/actions/auth";
import { currentGuardian } from "@/lib/session/guardian-session";
import { fields, resumeNotice, childAccountNotice, nextSteps, nextLabel, loginPrompt } from "./signup.fixture";

// CON-001 — 보호자 계정 만들기. 온보딩 5단계 중 1단계
export const metadata = { title: "계정 만들기 · 핀프렌즈" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  if (await currentGuardian()) redirect("/parent/onboarding");

  const { error, email } = await searchParams;

  return (
    <Screen title="계정 만들기" sub="1 / 6단계" back={{ href: "/login", label: "로그인" }}>
      <form action={signUpAction} className="grid gap-2.5">
        {fields.map((f) => (
          <div key={f.key} className="grid gap-1">
            <Label htmlFor={f.key} className="text-sub font-normal text-ink-soft">
              {f.label}
            </Label>
            <Input
              id={f.key}
              name={f.key}
              type={f.type}
              required
              defaultValue={f.key === "email" ? email : undefined}
              placeholder={f.placeholder}
              autoComplete={f.type === "email" ? "email" : "new-password"}
              className="min-h-touch rounded-card border-line bg-surface px-3 text-body text-ink placeholder:text-ink-mute"
            />
            {f.hint ? <small className="text-cap leading-relaxed text-ink-mute">{f.hint}</small> : null}
          </div>
        ))}

        {error ? (
          <p className="rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-sub leading-relaxed text-miss">
            {error}
          </p>
        ) : null}

        <div className="mt-0.5">
          <Card tone="grow">
            <h2 className="text-cap tracking-[0.03em] text-primary-d">{childAccountNotice.title}</h2>
            <p className="mt-1 text-sub leading-relaxed text-ink-soft">{childAccountNotice.body}</p>
          </Card>
        </div>

        <button
          type="submit"
          className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white"
        >
          {nextLabel}
        </button>
      </form>

      <p className="mt-2 text-center text-cap leading-relaxed text-ink-soft">{resumeNotice}</p>

      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">남은 단계</h2>
        <ol className="mt-1.5 grid gap-1">
          {nextSteps.map((s) => (
            <li key={s.n} className="flex items-baseline gap-2 rounded-card border border-dashed border-line-2 px-3 py-2">
              <span className="text-sub tabular-nums text-ink-mute">{s.n}</span>
              <span className="flex-1 text-sub leading-relaxed text-ink-soft">
                <b className="text-ink">{s.title}</b>
                {s.undecided ? <b className="ml-1 text-sub font-normal text-miss">방식 미정</b> : null}
                <br />
                {s.body}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-4 text-center text-sub text-ink-soft">
        {loginPrompt.question}{" "}
        <Link href={loginPrompt.href} className="font-bold text-primary-d underline underline-offset-2">
          {loginPrompt.label}
        </Link>
      </p>
    </Screen>
  );
}
