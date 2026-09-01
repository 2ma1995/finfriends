import Link from "next/link";
import { redirect } from "next/navigation";
import { guardianLanding } from "@/lib/session/landing";
import { Screen, Card } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/app/actions/auth";
import { currentGuardian } from "@/lib/session/guardian-session";
import { fields, submitLabel, resetNotice, sessionNotice, signupPrompt } from "./login.fixture";

// CON-001 — 보호자 로그인. 아동용 입력은 이 화면에 두지 않는다
export const metadata = { title: "로그인 · 핀프렌즈" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  // 이미 들어와 있는 사람을 로그인 화면에 붙잡아 두지 않는다
  const already = await currentGuardian();
  if (already) redirect(await guardianLanding(already.guardianId));

  const { error, email } = await searchParams;

  return (
    <Screen role="부모 화면" title="로그인" back={{ href: "/", label: "처음으로" }}>
      <form action={signInAction} className="grid gap-2.5">
        {fields.map((f) => (
          <div key={f.key} className="grid gap-1">
            <Label htmlFor={f.key} className="text-[0.8em] font-normal text-ink-soft">
              {f.label}
            </Label>
            <Input
              id={f.key}
              name={f.key}
              type={f.type}
              required
              defaultValue={f.key === "email" ? email : undefined}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              className="min-h-touch rounded-card border-line bg-surface px-3 text-[0.9em] text-ink placeholder:text-ink-mute"
            />
          </div>
        ))}

        {error ? (
          <p className="rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-[0.82em] leading-relaxed text-miss">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-0.5 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          {submitLabel}
        </button>
      </form>

      <p className="mt-2 text-center text-[0.76em] leading-relaxed text-ink-mute">{resetNotice}</p>

      <div className="mt-3">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{sessionNotice.title}</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{sessionNotice.body}</p>
        </Card>
      </div>

      <p className="mt-4 text-center text-[0.82em] text-ink-soft">
        {signupPrompt.question}{" "}
        <Link href={signupPrompt.href} className="font-bold text-primary-d underline underline-offset-2">
          {signupPrompt.label}
        </Link>
      </p>
    </Screen>
  );
}
