import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { CARD_STEPS } from "@/contracts/account";
import { findChild } from "@/modules/consent";
import { getGuardianEmail, getMyPage } from "@/modules/account";
import { advanceMockCardAction, resetMockCardAction } from "@/app/actions/parent-account";
import { currentGuardian } from "@/lib/session/guardian-session";
import { mockBanner, startLabel, whileWaiting } from "./card.fixture";

// 🔴 시연용 카드 신청 과정 — 어긋남 대장 D20. 실제 발급은 PTN-001(제휴사)
export const metadata = { title: "카드 신청 · 핀프렌즈" };

export default async function ParentCardPage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen title="카드 신청" back={{ href: "/parent/mypage", label: "내 정보" }}>
        <Empty
          emoji="🐣"
          title="등록한 아이가 없어요"
          body="카드는 아이 이름으로 신청합니다. 아이 프로필을 먼저 만들어 주세요."
          hint="온보딩 3단계"
        />
        <Link
          href="/parent/child/new"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  const email = await getGuardianEmail(guardian.authRef);
  const { card } = await getMyPage(guardian.guardianId, email);
  const nextStep = CARD_STEPS[card.stepIndex + 1] ?? null;

  return (
    <Screen title="카드 신청"
      sub={`${child.displayName} · ${card.status === null ? "시작 전" : `${card.stepIndex + 1} / ${CARD_STEPS.length}단계`}`}
      back={{ href: "/parent/mypage", label: "내 정보" }}
    >
      {/* 🔴 맨 위에 둔다. 시연에서 「이미 되는 기능」으로 오해되면 제휴 협상 전에 약속이 생긴다 */}
      <p className="rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-sub leading-relaxed text-miss">
        {mockBanner}
      </p>

      {/* 카드 모양 — 번호는 저장하지 않고 매번 만든다. 앞자리는 0000 */}
      <div className="mt-2.5">
        <div
          className="rounded-card px-4 py-5"
          style={{
            background: card.active
              ? "linear-gradient(135deg, var(--ff-primary-d), var(--ff-primary))"
              : "linear-gradient(135deg, var(--ff-line-2), var(--ff-line))",
          }}
        >
          <span className={`block text-cap tracking-[0.14em] ${card.active ? "text-white/70" : "text-ink-mute"}`}>
            FINFRIENDS
          </span>
          <b
            className={`mt-3 block text-body tabular-nums tracking-[0.06em] ${card.active ? "text-white" : "text-ink-soft"}`}
          >
            {card.maskedNumber}
          </b>
          <span className={`mt-2 block text-cap ${card.active ? "text-white/80" : "text-ink-mute"}`}>
            {card.active ? `${child.displayName} · ${card.issuedLabel ?? ""} 등록` : "아직 사용할 수 없어요"}
          </span>
        </div>
      </div>

      {/* 4단계 — 지난 단계는 ✓, 지금 할 단계는 강조, 남은 단계는 점선 */}
      <ol className="mt-3 grid gap-1.5">
        {CARD_STEPS.map((s, i) => {
          const done = i <= card.stepIndex;
          const current = i === card.stepIndex + 1;
          return (
            <li
              key={s.status}
              className={`rounded-card border p-3 ${
                current
                  ? "border-primary-l bg-primary-bg"
                  : done
                    ? "border-line bg-surface"
                    : "border-dashed border-line-2 bg-transparent"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-sub tabular-nums ${done ? "text-primary-d" : "text-ink-mute"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <b className={`text-body ${!done && !current ? "text-ink-mute" : ""}`}>{s.title}</b>
              </div>
              <p className={`mt-0.5 pl-5 text-sub leading-relaxed ${!done && !current ? "text-ink-mute" : "text-ink-soft"}`}>
                {s.body}
              </p>
            </li>
          );
        })}
      </ol>

      {/*
        🔴 각 단계는 「다음」 버튼뿐이다. 입력을 받지 않는다 —
           본인확인은 제휴사에 위임되므로(D-03) 실명·주민번호·계좌가 들어올 자리가 없다.
      */}
      {nextStep ? (
        <form action={advanceMockCardAction} className="mt-3">
          <button
            type="submit"
            className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white"
          >
            {nextStep.action}
          </button>
        </form>
      ) : (
        <p className="mt-3 rounded-card border border-primary-l/50 bg-primary-bg px-3 py-2 text-center text-sub text-primary-d">
          카드를 쓸 수 있어요. 아이가 결제하면 소비 내역에 쌓입니다.
        </p>
      )}

      {/* 배송 대기 중에도 학습은 열린다 — US-8 AC2 · F16 */}
      {card.status !== null && !card.active ? (
        <div className="mt-2.5">
          <Card tone="grow">
            <h2 className="text-cap tracking-[0.03em] text-primary-d">{whileWaiting.title}</h2>
            <p className="mt-1 text-sub leading-relaxed text-ink-soft">{whileWaiting.body}</p>
          </Card>
        </div>
      ) : null}

      {/*
        🔴 **끝내고 갈 곳이 없었다** (2026-09-03 사용자 지적).

           마지막 단계까지 누르면 「카드를 쓸 수 있어요」 문구와
           「처음부터 다시」만 남았다. 돌아가기는 «마이페이지»로 가므로
           온보딩에서 온 부모는 **자기가 6단계를 끝냈다는 것을 볼 자리가 없다.**

        🔴 **끝났을 때만 보인다.** 중간에는 위에 「다음」 버튼이 있어서 길이 있다.
           둘을 같이 두면 어느 쪽이 본 길인지 사라진다.

        🔴 **시작하기(온보딩 목록)로 보낸다.** 나무로 곧장 보내지 않는다 —
           6단계에 ✓ 가 찍힌 것을 «보고» 나가야 「다 끝났구나」를 안다.
           그 화면이 「모두 끝났어요」와 「성장 나무 보기」를 이어서 말해 준다.
      */}
      {nextStep === null ? (
        <Link
          href="/parent/onboarding"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          {startLabel}
        </Link>
      ) : null}

      {card.status !== null ? (
        <form action={resetMockCardAction} className="mt-4 border-t border-line pt-4">
          <button
            type="submit"
            className="min-h-touch w-full rounded-card border border-line-2 text-sub text-ink-soft"
          >
            처음부터 다시 (시연용)
          </button>
        </form>
      ) : null}
    </Screen>
  );
}
