import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import { findChild } from "@/modules/consent";
import { registerChildDeviceAction } from "@/app/actions/device";
import { whatHappens, notCollected, parentExitNotice } from "./join.fixture";

// CON-001 · D5-b — 아이 기기 등록. 로그인이 아니라 **기기 등록**이다
export const metadata = { title: "기기 등록 · 핀프렌즈" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const guardian = await currentGuardian();

  // 🔴 등록은 보호자 행위다. 아이 기기에서 부모가 직접 로그인해 누른다
  if (!guardian) {
    return (
      <Screen role="부모 확인" title="기기 등록" back={{ href: "/login", label: "로그인" }}>
        <Empty
          emoji="🔑"
          title="부모가 먼저 로그인해 주세요"
          body="이 기기를 아이 화면으로 등록하는 것은 부모만 할 수 있어요."
          hint="아이는 아이디도 비밀번호도 만들지 않습니다"
        />
        <Link
          href="/login"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          로그인하기
        </Link>
      </Screen>
    );
  }

  const child = await findChild(guardian.guardianId);

  if (!child) {
    return (
      <Screen role="부모 확인" title="기기 등록" back={{ href: "/parent/onboarding", label: "시작하기" }}>
        <Empty
          emoji="🐣"
          title="등록할 아이가 아직 없어요"
          body="아이 프로필을 먼저 만들면 이 기기를 그 아이의 화면으로 등록할 수 있어요."
          hint="온보딩 3단계 · 아이 프로필"
        />
      </Screen>
    );
  }

  return (
    <Screen
      role="부모 확인"
      title={`${child.displayName}의 기기가 맞나요?`}
      sub={`${child.birthYear}년생 · 부모가 눌러 주세요`}
      back={{ href: "/parent/invite", label: "자녀 초대" }}
    >
      <section>
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">등록하면 이렇게 됩니다</h2>
        <ul className="mt-1.5 grid gap-1">
          {whatHappens(child.displayName).map((line) => (
            <li key={line} className="rounded-card border border-line bg-surface px-3 py-2 text-[0.84em] leading-relaxed text-ink-soft">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-2.5">
        <Card>
          <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{notCollected.join(" · ")}</p>
        </Card>
      </div>

      {error ? (
        <p className="mt-2.5 rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-[0.82em] leading-relaxed text-miss">
          {error}
        </p>
      ) : null}

      {guardian.consentCompleted ? (
        <form action={registerChildDeviceAction}>
          <input type="hidden" name="childId" value={child.id} />
          <button
            type="submit"
            className="mt-3 min-h-touch w-full rounded-card bg-primary px-3 text-[0.88em] font-bold text-white"
          >
            이 기기를 {child.displayName}의 화면으로 등록하기
          </button>
        </form>
      ) : (
        <Link
          href="/consent"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card border border-miss-line bg-miss-bg px-3 text-center text-[0.88em] font-bold text-miss"
        >
          동의를 먼저 마쳐야 등록할 수 있어요
        </Link>
      )}

      <p className="mt-2 text-center text-[0.76em] leading-relaxed text-ink-soft">{parentExitNotice}</p>
    </Screen>
  );
}
