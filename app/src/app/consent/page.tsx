import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card } from "@/components/shared/Screen";
import { CONSENT_ITEMS, NOT_COLLECTED, GATE_NOTICE } from "@/contracts/consent";
import { readConsentState } from "@/modules/consent";
import { completeConsentAction, withdrawConsentAction } from "@/app/actions/consent";
import { currentGuardian } from "@/lib/session/guardian-session";

// CON-002 — 법정대리인 동의 게이트
export const metadata = { title: "동의 · 핀프렌즈" };

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const guardian = await currentGuardian();

  // 🔴 동의는 보호자가 하는 행위다. 로그인 없이 이 화면이 의미를 갖지 않는다
  if (!guardian) redirect("/login");

  const state = await readConsentState(guardian.guardianId);

  // 이미 동의한 뒤 다시 들어온 경우 — 무엇을 언제 동의했는지 보여주고 철회 경로를 준다
  if (state.completed) {
    return (
      <Screen role="보호자 확인" title="동의 완료" sub="만 14세 미만 아동" back={{ href: "/parent/onboarding", label: "시작하기" }}>
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">동의가 끝났어요</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">
            {state.completedAt
              ? `${state.completedAt.getFullYear()}년 ${state.completedAt.getMonth() + 1}월 ${state.completedAt.getDate()}일에 동의했습니다.`
              : "동의 기록이 있습니다."}
          </p>
        </Card>

        <ul className="mt-2 grid gap-1">
          {CONSENT_ITEMS.filter((i) => i.required).map((i) => (
            <li key={i.key} className="flex items-start gap-2 rounded-card border border-line bg-surface px-3 py-2">
              <span className="mt-0.5 text-[0.9em] text-primary">☑</span>
              <span className="flex-1 text-[0.82em] leading-relaxed text-ink-soft">{i.label}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/parent/onboarding"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          이어서 하기
        </Link>

        <form action={withdrawConsentAction} className="mt-4 border-t border-line pt-4">
          <button
            type="submit"
            className="min-h-touch w-full rounded-card border border-miss-line text-[0.82em] text-miss"
          >
            동의 철회하기
          </button>
        </form>
        <p className="mt-1.5 text-center text-[0.74em] leading-relaxed text-ink-mute">
          철회하면 아이 화면이 바로 잠깁니다. 기기를 다시 등록할 필요는 없어요.
        </p>
      </Screen>
    );
  }

  return (
    <Screen role="보호자 확인" title="시작하기 전에" sub="만 14세 미만 아동" back={{ href: "/screens", label: "화면 목록" }}>
      <form action={completeConsentAction}>
        <ul className="grid gap-1.5">
          {CONSENT_ITEMS.map((i) => (
            <li key={i.key}>
              <label
                htmlFor={i.key}
                className="flex min-h-touch cursor-pointer items-start gap-2 rounded-card border border-line bg-surface p-3"
              >
                <input
                  id={i.key}
                  name={i.key}
                  type="checkbox"
                  required={i.required}
                  className="mt-1 size-4 shrink-0 accent-[var(--ff-primary)]"
                />
                <span className="flex-1 text-[0.84em] leading-relaxed">
                  {i.label}
                  {i.required ? <b className="ml-1 text-[0.82em] text-miss">필수</b> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-2">
          <Card>
            <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
            <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{NOT_COLLECTED.join(" · ")}</p>
          </Card>
        </div>

        {error ? (
          <p className="mt-2 rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-[0.82em] leading-relaxed text-miss">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-3 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          동의하고 시작하기
        </button>
      </form>

      <p className="mt-2 text-center text-[0.74em] text-ink-mute">{GATE_NOTICE}</p>
    </Screen>
  );
}
