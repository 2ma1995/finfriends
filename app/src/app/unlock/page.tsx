import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { PIN_LENGTH } from "@/lib/session/child-mode-pin";
import { unlockAction } from "@/app/actions/child-mode-pin";
import {
  backLabel, errors, graceNotice, lead, lockedHelp, pinLabel, submitLabel, title, triesLeft,
} from "./unlock.fixture";

/**
 * 아동 모드 잠금 해제 — `D5` · `REQ-NF-011` · 어긋남 대장 D41.
 *
 * 🔴 **`/parent/**` 가 아니다.** 아동 모드 기기에서 열려야 하는데
 *    미들웨어가 `/parent/**` 를 막으므로, 막히지 않는 자리에 둔다.
 *
 * 🔴 **로그인 화면이 아니다.** 이메일·비밀번호를 받지 않는다 —
 *    아이 기기에서 부모 비밀번호를 매번 치면 **아이가 그 비밀번호를 알게 된다** (`D5`).
 */
export const metadata = { title: "부모님 확인 · 핀프렌즈" };

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; left?: string }>;
}) {
  const sp = await searchParams;
  const locked = sp.err === "LOCKED";

  return (
    <Screen title={title}>
      <Card>
        <p className="text-sub leading-relaxed">{lead}</p>
      </Card>

      {sp.err ? (
        <div className="mt-2">
          <Card tone="miss">
            <p className="text-sub">{errors[sp.err] ?? errors.WRONG}</p>
            {/* 🔴 남은 횟수를 말한다. 안 말하면 갑자기 잠긴 것으로 보인다 */}
            {sp.err === "WRONG" && sp.left ? (
              <p className="mt-1 text-sub text-ink-soft">{triesLeft(Number(sp.left))}</p>
            ) : null}
            {locked ? <p className="mt-1 text-sub leading-relaxed text-ink-soft">{lockedHelp}</p> : null}
          </Card>
        </div>
      ) : null}

      {!locked ? (
        <form action={unlockAction} className="mt-3 grid gap-2">
          <label className="grid gap-1">
            <span className="text-sub text-ink-mute">{pinLabel}</span>
            {/*
              🔴 `type="password"` 다. 아이가 옆에서 보는 상황을 전제로 만든다.
                 `inputMode="numeric"` 이라 숫자 자판이 뜬다.
            */}
            <input
              name="pin" type="password" inputMode="numeric" autoComplete="off"
              pattern={`\\d{${PIN_LENGTH}}`} maxLength={PIN_LENGTH} required
              className="min-h-touch rounded-card border border-line bg-surface px-3 text-center text-title tracking-[0.4em] tabular-nums"
            />
          </label>
          <button className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
            {submitLabel}
          </button>
          {/* 🔴 잠깐만 열린다는 것을 미리 말한다 */}
          <p className="text-cap leading-relaxed text-ink-mute">{graceNotice}</p>
        </form>
      ) : (
        <Link
          href="/login"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          로그인으로 들어가기
        </Link>
      )}

      <Link
        href="/child/home"
        className="mt-2 flex min-h-touch w-full items-center justify-center rounded-card border border-line-2 bg-surface text-sub text-ink-soft"
      >
        {backLabel}
      </Link>
    </Screen>
  );
}
