import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import { getWithdrawPreview } from "@/modules/account";
import { withdrawAction } from "@/app/actions/parent-account";
import {
  cancelLabel, confirmLabel, failed, loseLabels, needConfirm, refundNotice,
  starNotice, submitLabel, title, warn,
} from "./withdraw.fixture";

/**
 * 탈퇴 확인 — `FR-041` · `AC-041-1`.
 *
 * 🔴 **한 번에 지워지지 않는다.** 마이페이지에서 바로 실행하지 않고 이 화면을 거친다 —
 *    되돌릴 수 없는 일은 실수로 눌릴 수 있는 자리에 두지 않는다.
 */
export const metadata = { title: "탈퇴하기 · 핀프렌즈" };

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const g = await currentGuardian();
  if (!g) redirect("/login");

  const [sp, p] = await Promise.all([searchParams, getWithdrawPreview(g.guardianId)]);

  return (
    <Screen title={title} back={{ href: "/parent/mypage", label: "내 정보" }}>
      {sp.error ? (
        <div className="mb-2">
          <Card tone="miss">
            <p className="text-sub">{sp.error === "CONFIRM" ? needConfirm : failed}</p>
          </Card>
        </div>
      ) : null}

      {/* 🔴 되돌릴 수 없다는 것을 맨 위에서, 진행 전에 (AC-041-1) */}
      <Card tone="miss">
        <b className="text-sub">{warn.title}</b>
        <p className="mt-1 text-sub leading-relaxed text-ink-soft">{warn.body}</p>
      </Card>

      {/* 🔴 무엇을 잃는지 숫자로 보여준다. 「기록이 지워집니다」는 크기를 감춘다 */}
      {p.childName ? (
        <div className="mt-2.5 rounded-card border border-line-2 bg-sand p-3">
          <span className="block text-cap text-ink-mute">{p.childName}의 기록</span>
          <dl className="mt-1.5 grid gap-1 text-sub">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-mute">{loseLabels.stars}</dt>
              <dd className="tabular-nums">⭐ {p.starsEarned}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-mute">{loseLabels.trees}</dt>
              <dd className="tabular-nums">{p.grownSlots}칸</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-mute">{loseLabels.missions}</dt>
              <dd className="tabular-nums">{p.missionsApproved}개</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-mute">{loseLabels.allowance}</dt>
              <dd className="tabular-nums">{won(p.allowanceWon)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {/* 🔴 우리가 환불하지 않는다. 실제 돈은 제휴사에 있다 (ADR-004) */}
      <div className="mt-2.5">
        <Card>
          <b className="text-sub">{refundNotice.title}</b>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{refundNotice.body}</p>
          <p className="mt-1.5 text-sub leading-relaxed text-ink-mute">{starNotice}</p>
        </Card>
      </div>

      {/* 🔴 명시적 확인 없이는 진행되지 않는다. 서버가 다시 검사한다 */}
      <form action={withdrawAction} className="mt-4 grid gap-2">
        <label className="flex items-start gap-2 rounded-card border border-line bg-surface p-3">
          <input type="checkbox" name="confirm" value="yes" className="mt-0.5 size-4 shrink-0" />
          <span className="text-sub leading-relaxed">{confirmLabel}</span>
        </label>
        <button className="min-h-touch w-full rounded-card border border-miss-line bg-miss-bg text-body font-bold text-miss">
          {submitLabel}
        </button>
      </form>

      <Link
        href="/parent/mypage"
        className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card border border-line-2 bg-surface text-sub text-ink-soft"
      >
        {cancelLabel}
      </Link>
    </Screen>
  );
}
