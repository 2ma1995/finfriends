"use client";

import { useState } from "react";
import { TOPUP_AMOUNTS } from "@/contracts/bank";

/**
 * 용돈 넣기 — 어긋남 대장 D59.
 *
 * 🔴 **금액 버튼이 바로 넣지 않는다** (2026-09-01 사용자 요청).
 *
 *    전에는 `+30,000` 을 누르는 순간 원장에 줄이 적혔다. 누르자마자 끝나니
 *    **잘못 누른 것을 되돌릴 기회가 없었다** — 아이 화면의 숫자가 즉시 바뀌고,
 *    상쇄하는 줄을 새로 적어야 한다(`/parent/bank/adjust`).
 *    이제 버튼은 **입력란을 채우기만** 하고, 넣는 것은 「넣기」 하나다.
 *
 * 🔴 **누른 것이 보여야 한다.** 입력란만 조용히 바뀌면 부모가 그 칸을 안 보고 있었을 때
 *    「눌렸나?」 싶어 또 누른다. 누른 금액 버튼을 눌린 상태로 표시한다.
 *
 * 🔴 **더하지 않고 바꾼다.** `+30,000` 의 `+` 는 「아이에게 이만큼 준다」는 뜻이고
 *    입력란에 누적하라는 뜻이 아니다. 누적이면 지울 방법이 없어진다.
 *
 * 🔴 **화면 검사는 검사가 아니다.** `min`·`max` 를 걸어도 `topUpAllowance` 가
 *    정수와 상한을 다시 본다 — Server Action 은 공개 엔드포인트다 (§6.6 규약 ②).
 */
export function TopUpForm({
  action, labels,
}: {
  action: (formData: FormData) => void;
  labels: {
    srLabel: string; placeholder: string; submit: string;
    hint: string; presetHint: string;
  };
}) {
  const [amount, setAmount] = useState("");
  const picked = TOPUP_AMOUNTS.find((a) => String(a) === amount) ?? null;

  return (
    <form action={action}>
      {/* 🔴 자주 쓰는 금액은 버튼 — 세 번 중 두 번은 이걸로 끝난다 */}
      <div className="grid grid-cols-3 gap-1.5">
        {TOPUP_AMOUNTS.map((a) => {
          const on = picked === a;
          return (
            <button
              key={a}
              // 🔴 `type="button"` 이어야 한다. 빼면 폼이 제출돼 예전 동작으로 돌아간다
              type="button"
              onClick={() => setAmount(String(a))}
              aria-pressed={on}
              className={`min-h-touch w-full rounded-card border text-sub tabular-nums ${
                on
                  ? "border-primary bg-primary-bg font-bold text-primary-d"
                  : "border-line-2 bg-surface text-ink-soft"
              }`}
            >
              +{a.toLocaleString("ko-KR")}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <label className="sr-only" htmlFor="topup-amount">{labels.srLabel}</label>
        <input
          id="topup-amount" name="amount" type="number" inputMode="numeric"
          min={1} max={500000} step={1} required placeholder={labels.placeholder}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-h-touch flex-1 rounded-card border border-line bg-surface px-3 text-right text-body tabular-nums"
        />
        <span className="shrink-0 text-sub text-ink-mute">원</span>
        <button
          type="submit"
          // 🔴 빈 칸으로 누르면 서버까지 갔다가 오류로 돌아온다. 미리 막는다
          disabled={amount.trim().length === 0}
          className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-sub font-bold text-white disabled:cursor-not-allowed disabled:bg-line-2 disabled:font-normal disabled:text-ink-mute"
        >
          {labels.submit}
        </button>
      </div>

      {/* 🔴 버튼이 바로 넣지 않는다는 것을 말한다 — 안 적으면 눌러 놓고 넣은 줄 안다 */}
      <p className="mt-1 text-cap leading-relaxed text-ink-mute">{labels.presetHint}</p>
      <p className="mt-0.5 text-cap leading-relaxed text-ink-mute">{labels.hint}</p>
    </form>
  );
}
