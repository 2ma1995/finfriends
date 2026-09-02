import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import { findChild } from "@/modules/consent";
import { issueInvite } from "@/lib/session/child-invite";
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
      <Screen title="기기 등록" back={{ href: "/login", label: "로그인" }}>
        <Empty
          emoji="🔑"
          title="부모가 먼저 로그인해 주세요"
          body="이 기기를 아이 화면으로 등록하는 것은 부모만 할 수 있어요."
          hint="아이는 아이디도 비밀번호도 만들지 않습니다"
        />
        <Link
          href="/login"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          로그인하기
        </Link>
      </Screen>
    );
  }

  const child = await findChild(guardian.guardianId);

  if (!child) {
    return (
      <Screen title="기기 등록" back={{ href: "/parent/onboarding", label: "시작하기" }}>
        <Empty
          emoji="🐣"
          title="등록할 아이가 아직 없어요"
          body="아이 프로필을 먼저 만들면 이 기기를 그 아이의 화면으로 등록할 수 있어요."
          hint="온보딩 3단계 · 아이 프로필"
        />
      </Screen>
    );
  }

  /**
   * 🔴 **여기서 초대 코드를 만든다.** 소유 확인은 위 `findChild` 가 이미 했다 —
   *    세션의 보호자에게서 찾은 아이이므로 남의 아이가 올 수 없다.
   *
   *    동의 전에는 만들지 않는다. 링크가 나가면 화면에 「등록됐다」는
   *    잘못된 신호가 남는다.
   */
  const invite = guardian.consentCompleted
    ? (await issueInvite(guardian.guardianId, child.id)).token
    : null;

  return (
    <Screen title={`${child.displayName}의 기기가 맞나요?`}
      sub={`${child.birthYear}년생 · 부모가 눌러 주세요`}
      back={{ href: "/parent/invite", label: "자녀 초대" }}
    >
      <section>
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">등록하면 이렇게 됩니다</h2>
        <ul className="mt-1.5 grid gap-1">
          {whatHappens(child.displayName).map((line) => (
            <li key={line} className="rounded-card border border-line bg-surface px-3 py-2 text-sub leading-relaxed text-ink-soft">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-2.5">
        <Card>
          <h2 className="text-cap tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{notCollected.join(" · ")}</p>
        </Card>
      </div>

      {error ? (
        <p className="mt-2.5 rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-sub leading-relaxed text-miss">
          {error}
        </p>
      ) : null}

      {guardian.consentCompleted && invite ? (
        /**
         * 🔴 **평범한 GET 이동이다. Server Action 이 아니다** (어긋남 대장 D66).
         *
         *    전에는 Server Action 이 초대 코드를 만들고 `redirect("/child/enter?t=…")`
         *    했다. `/child/enter` 는 **쿠키를 굽는 Route Handler** 인데,
         *    Server Action 의 `redirect` 는 브라우저 문서 이동이 아니라
         *    **클라이언트 라우터 이동**이다 — 라우터가 등록 «전»에 받아 둔
         *    `/child/home` 화면을 캐시에서 돌려주면 부모가 눌러도
         *    「아직 준비가 안 됐어요」가 계속 뜬다. 실기기 운영에서 그렇게 나왔다.
         *
         *    `method="get"` 폼 제출은 **진짜 문서 이동**이라 라우터가 끼지 않는다.
         *    쿠키가 그 응답에서 붙고, 이어지는 `/child/home` 은 새 요청으로 받는다.
         *
         * 🔴 초대 코드는 이 화면을 그릴 때 만든다. 24시간 1회용이므로
         *    안 누르고 떠나도 스스로 죽는다.
         */
        <form method="get" action="/child/enter">
          <input type="hidden" name="t" value={invite} />
          <button
            type="submit"
            className="mt-3 min-h-touch w-full rounded-card bg-primary px-3 text-body font-bold text-white"
          >
            이 기기를 {child.displayName}의 화면으로 등록하기
          </button>
        </form>
      ) : (
        <Link
          href="/consent"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card border border-miss-line bg-miss-bg px-3 text-center text-sub font-bold text-miss"
        >
          동의를 먼저 마쳐야 등록할 수 있어요
        </Link>
      )}

      <p className="mt-2 text-center text-cap leading-relaxed text-ink-soft">{parentExitNotice}</p>
    </Screen>
  );
}
