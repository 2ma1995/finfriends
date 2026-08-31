import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fields, submitLabel, resetNotice, sessionNotice, signupPrompt } from "./login.fixture";

// CON-001 — 보호자 로그인. 아동용 입력은 이 화면에 두지 않는다
export const metadata = { title: "로그인 · 핀프렌즈" };

export default function LoginPage() {
  return (
    <Screen role="부모 화면" title="로그인" back={{ href: "/", label: "화면 목록" }}>
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
              autoComplete={f.autoComplete}
              className="min-h-touch rounded-card border-line bg-surface px-3 text-[0.9em] text-ink placeholder:text-ink-mute"
            />
          </div>
        ))}
      </div>

      <button className="mt-3 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">
        {submitLabel}
      </button>

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
