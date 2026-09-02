import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { findChild } from "@/modules/consent";
import { getBank } from "@/modules/bank";
import { topUpMockAction } from "@/app/actions/parent-bank";
import { TopUpForm } from "@/components/parent/TopUpForm";
import { currentGuardian } from "@/lib/session/guardian-session";
import { listForGuardian } from "@/modules/savings";
import {
  adjustLabel, cardNeeded, customHint, customLabel, customPlaceholder, customSubmit,
  clearLabel, historyLabel, missionNotice, overMaxNotice, presetHint, savedNotice,
  topUpErrors, topUpTitle, walletLabels,
} from "./bank.fixture";

/**
 * 아이 통장(보호자용) — SRS §3 · 잔액 · 충전 · 기록 · 미션 관리 · 적금 · D18 · D21.
 *
 * 🔴 **이자율 설정 칸이 여기 없다.** §3 이 「이자율 설정」을 이 화면에 적어 뒀지만,
 *    이자율은 **적금을 승인하는 자리에서 건마다 정한다**(`/parent/bank/savings` 의 입력란).
 *    두 곳에 두면 통장에서 바꿔도 이미 올라온 신청은 안 바뀌어서 **바꾼 줄 아는 부모**가 생긴다
 *    — 신청 시점에 이자율이 그 약속에 박히기 때문이다 (어긋남 대장 D28).
 *
 * 🔴 **용돈 화면은 여기 하나다.** `/parent/allowance` 를 여기로 합쳤다 —
 *    화면이 둘이면 잔액도 둘이 되고, 실제로 그렇게 갈렸다.
 */
export const metadata = { title: "아이 통장 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function ParentBankPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen title="아이 통장">
        <Empty
          emoji="🐣"
          title="등록한 아이가 없어요"
          body="아이 프로필을 만들면 통장이 열립니다."
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

  const sp = await searchParams;
  // 🔴 잔액과 기록은 **같은 원장**에서 온다. 두 곳에서 읽으면 다시 갈린다
  const [view, savings] = await Promise.all([
    getBank(guardian.guardianId, child.id, child.displayName),
    listForGuardian(guardian.guardianId),
  ]);
  // 🔴 만기가 된 것도 「할 일」이다 — 부모가 눌러야 아이에게 원금과 이자가 간다
  const savingsRequested = savings.requested.length + savings.active.filter((a) => a.matured).length;

  return (
    <Screen title="아이 통장" sub={child.displayName}>
      {sp.saved ? (
        <div className="mb-2"><Card tone="grow"><p className="text-sub">{savedNotice}</p></Card></div>
      ) : null}
      {sp.error ? (
        <div className="mb-2"><Card tone="miss">
          <p className="text-sub">{topUpErrors[sp.error] ?? topUpErrors.BAD_AMOUNT}</p>
        </Card></div>
      ) : null}
      {/*
        ── 아이가 가진 돈 ──
        🔴 **부분의 합이 항상 위 숫자와 같아야 한다.** 한동안 목표에 묶인 돈을
           이자 카드 안에만 뒀는데, 이자율을 안 정한 부모에게는 그 돈이 화면 어디에도
           없었다 — 20,000원을 줬는데 10,500원만 떴다.
      */}
      <div className="mt-2.5 rounded-card border border-line-2 bg-sand p-3">
        <div className="text-center">
          <span className="block text-cap text-ink-mute">{walletLabels.total(child.displayName)}</span>
          <b className="text-hero tabular-nums">{won(view.totalWon)}</b>
        </div>
        {/*
          🔴 **부분의 합이 항상 위 숫자와 같아야 한다.** 묶인 돈이 늘 때마다
             줄을 손으로 더하다 보면 하나를 빠뜨리고, 그러면 「돈이 어디 갔지」가 된다.
             0원인 줄만 감추고 **0이 아닌 것은 전부 보여준다.**
        */}
        <div className="mt-2 grid gap-1 border-t border-line pt-2">
          {[
            { label: walletLabels.free, amount: view.freeWon, always: true, note: null },
            { label: walletLabels.setAside, amount: view.setAsideWon, always: false, note: walletLabels.setAsideNote },
            { label: walletLabels.locked, amount: view.lockedWon, always: false, note: walletLabels.lockedNote },
          ]
            .filter((r) => r.always || r.amount > 0)
            .map((r) => (
              <div key={r.label}>
                <div className="flex items-baseline justify-between gap-2 text-sub">
                  <span className="text-ink-mute">{r.label}</span>
                  <b className="tabular-nums">{won(r.amount)}</b>
                </div>
                {/* 🔴 숫자만 보면 「어디 갔지」가 된다. 묶인 이유를 그 자리에서 말한다 */}
                {r.note && r.amount > 0 ? (
                  <p className="text-cap leading-relaxed text-ink-mute">{r.note}</p>
                ) : null}
              </div>
            ))}
        </div>
      </div>

      <section className="mt-2.5">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">{topUpTitle}</h2>
        {/*
          🔴 **금액 버튼이 바로 넣지 않는다** (2026-09-01 사용자 요청 · D59).
             누르는 순간 적히면 잘못 누른 것을 되돌릴 기회가 없다 —
             아이 화면 숫자가 즉시 바뀌고 상쇄하는 줄을 새로 적어야 한다.
             버튼은 칸을 채우고, 넣는 것은 「넣기」 하나다.

          🔴 **클라이언트 컴포넌트다.** 누른 금액을 칸에 넣는 것은 브라우저 일이다.
             서버 액션은 그대로 넘겨준다 — 검사는 `topUpAllowance` 가 다시 한다.
        */}
        <div className="mt-1.5">
          <TopUpForm
            action={topUpMockAction}
            labels={{
              srLabel: customLabel, placeholder: customPlaceholder,
              submit: customSubmit, hint: customHint, presetHint,
              clear: clearLabel, overMax: overMaxNotice,
            }}
          />
        </div>

        {!view.cardActive ? (
          <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{cardNeeded}</p>
        ) : null}

        {/*
          🔴 **보는 것과 고치는 것을 나눈다.** 한 화면에서 목록을 훑다가
             실수로 되돌리면 아이 장부가 바뀐다. 되돌리기는 되돌릴 수 없는 일이 아니지만
             (상쇄하는 줄이 하나 더 적힐 뿐) 아이 화면의 숫자가 즉시 바뀐다.
        */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Link
            href="/parent/bank/adjust"
            className="flex min-h-touch items-center justify-center rounded-card border border-line-2 bg-surface text-sub text-ink-soft"
          >
            {adjustLabel}
          </Link>
          <Link
            href="/parent/bank/history"
            className="flex min-h-touch items-center justify-center rounded-card border border-line-2 bg-surface text-sub text-ink-soft"
          >
            {historyLabel}
          </Link>
        </div>
      </section>

      {/* ── 미션 관리 — SRS 는 이것도 통장 안에 뒀다 ── */}
      {/* 🔴 「불리기」 실천을 여는 자리 — 아이가 신청하면 여기로 온다 (D25) */}
      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">우리 집 적금</h2>
        <div className="mt-1.5 grid gap-1">
          <Link
            href="/parent/bank/savings"
            className="flex min-h-touch items-center justify-between rounded-card border border-line bg-surface px-3 text-sub"
          >
            <span>적금 신청과 만기</span>
            <b className={savingsRequested > 0 ? "text-miss" : "text-ink-mute"}>
              {savingsRequested > 0 ? `${savingsRequested}건 →` : "→"}
            </b>
          </Link>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-cap tracking-[0.06em] text-ink-mute">미션 관리</h2>
        <div className="mt-1.5 grid gap-1">
          <Link
            href="/parent/bank/missions"
            className="flex min-h-touch items-center justify-between rounded-card border border-line bg-surface px-3 text-sub"
          >
            <span>승인을 기다리는 미션</span>
            <b className={view.waitingMissions > 0 ? "text-miss" : "text-ink-mute"}>
              {view.waitingMissions}건 →
            </b>
          </Link>
          <Link
            href="/parent/bank/missions/new"
            className="flex min-h-touch items-center justify-between rounded-card border border-line bg-surface px-3 text-sub"
          >
            <span>미션 만들기</span>
            <span className="text-sub text-ink-mute">아직 안 한 미션 {view.openMissions}개 →</span>
          </Link>
        </div>
        <p className="mt-1.5 text-cap leading-relaxed text-ink-mute">{missionNotice}</p>
      </section>
    </Screen>
  );
}
