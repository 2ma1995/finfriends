import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGE_LIMIT, DEVICE_TYPES, NAME_MAX } from "@/contracts/child";
import { findChild } from "@/modules/consent";
import { saveChildProfileAction } from "@/app/actions/parent-onboarding";
import { currentGuardian } from "@/lib/session/guardian-session";

// CON-003 — 온보딩 3단계 아이 프로필. §6.1 진입점 2번 `saveOnboardingStep`
export const metadata = { title: "아이 프로필 · 핀프렌즈" };

export default async function NewChildPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; name?: string; year?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  // 🔴 동의 전에는 아동 정보를 받지 않는다 (P-05 · P-22)
  if (!guardian.consentCompleted) redirect("/consent");

  // MVP 는 아이 한 명이다. 이미 있으면 다시 만들 화면이 아니다
  const existing = await findChild(guardian.guardianId);
  if (existing) redirect("/parent/invite");

  const { error, name, year } = await searchParams;
  const thisYear = new Date().getFullYear();

  return (
    <Screen title="아이 프로필"
      sub="3 / 6단계"
      back={{ href: "/parent/onboarding", label: "시작하기" }}
    >
      <form action={saveChildProfileAction} className="grid gap-2.5">
        <div className="grid gap-1">
          <Label htmlFor="displayName" className="text-sub font-normal text-ink-soft">
            아이가 화면에서 볼 이름
          </Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            required
            maxLength={NAME_MAX}
            defaultValue={name}
            placeholder="예: 서연"
            className="min-h-touch rounded-card border-line bg-surface px-3 text-body text-ink placeholder:text-ink-mute"
          />
          <small className="text-cap leading-relaxed text-ink-mute">
            별명도 괜찮아요. 실명 확인에 쓰지 않습니다.
          </small>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="birthYear" className="text-sub font-normal text-ink-soft">
            태어난 해
          </Label>
          <Input
            id="birthYear"
            name="birthYear"
            type="number"
            inputMode="numeric"
            /**
             * 🔴 **`min`·`max`·`required` 를 걸지 않는다** (어긋남 대장 D66).
             *    범위를 벗어난 값을 넣으면 브라우저가 **조용히 막고 자기 말풍선만** 띄운다 —
             *    화면은 아무 반응이 없어 「버튼이 안 눌린다」로 읽힌다. 오늘 세 번 제보됐다.
             *    막는 것은 서버 하나면 된다. 서버가 검사하고 이 화면으로 문구를 돌려보낸다.
             */
            // `createChildProfile` 이 검사하고 BIRTH_YEAR_INVALID · TOO_OLD 를 돌려보낸다
            defaultValue={year}
            placeholder={`예: ${thisYear - 9}`}
            className="min-h-touch rounded-card border-line bg-surface px-3 text-body tabular-nums text-ink placeholder:text-ink-mute"
          />
          <small className="text-cap leading-relaxed text-ink-mute">
            생년월일 전체는 받지 않습니다. 만 {AGE_LIMIT}세 미만까지 이용할 수 있어요.
          </small>
        </div>

        <fieldset className="grid gap-1">
          <legend className="mb-1 text-sub text-ink-soft">아이가 쓸 기기</legend>
          <div className="grid gap-1">
            {DEVICE_TYPES.map((d) => (
              <label
                key={d.value}
                htmlFor={`device-${d.value}`}
                className="flex min-h-touch cursor-pointer items-start gap-2 rounded-card border border-line bg-surface px-3 py-2"
              >
                <input
                  id={`device-${d.value}`}
                  name="deviceType"
                  type="radio"
                  value={d.value}
                  required
                  className="mt-1 size-4 shrink-0 accent-[var(--ff-primary)]"
                />
                <span className="flex-1 text-sub leading-relaxed">
                  {d.label}
                  <br />
                  <small className="text-sub text-ink-mute">{d.hint}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-0.5">
          <Card>
            <h2 className="text-cap tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
            <p className="mt-1 text-sub leading-relaxed text-ink-soft">
              생년월일 전체 · 연락처 · 학교
            </p>
          </Card>
        </div>

        {error ? (
          <p className="rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-sub leading-relaxed text-miss">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white"
        >
          저장하고 다음
        </button>
      </form>

      <p className="mt-2 text-center text-cap leading-relaxed text-ink-soft">
        나중에 고칠 수 있어요. 지금은 아이가 시작할 수 있게만 채웁니다.
      </p>

      <p className="mt-3 text-center text-sub">
        <Link href="/parent/onboarding" className="text-ink-mute underline underline-offset-2">
          나중에 하기
        </Link>
      </p>
    </Screen>
  );
}
