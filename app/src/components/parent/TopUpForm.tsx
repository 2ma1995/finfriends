"use client";

import { useState } from "react";
import { MAX_TOPUP, TOPUP_AMOUNTS } from "@/contracts/bank";

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
 * 🔴 **누르면 더한다** (2026-09-01 사용자 요청). 처음엔 바꾸게 했다 —
 *    `+30,000` 의 `+` 를 「아이에게 이만큼 준다」로 읽었기 때문이다.
 *    사용자가 누적을 원했고, 그게 실제로 쓰기 편하다:
 *    30,000 + 10,000 + 5,000 을 눌러 45,000 을 만들 수 있다.
 *    지울 방법은 **「비우기」 버튼**으로 따로 뒀다 — 누적만 되고 지울 수 없으면 갇힌다.
 *
 * 🔴 **상한을 넘기면 알린다.** 조용히 잘라내면 부모가 누른 것과 다른 숫자가 들어간다.
 *    넘기는 누름은 **아예 반영하지 않는다** — 500,000 으로 맞춰 주면
 *    부모가 안 누른 금액이 칸에 남는다.
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
    hint: string; presetHint: string; clear: string; overMax: string;
  };
}) {
  const [amount, setAmount] = useState("");
  const current = Number.parseInt(amount, 10);
  const total = Number.isFinite(current) && current > 0 ? current : 0;

  /**
   * 🔴 **누른 만큼 더한다.** 상한을 넘기면 알리고 **더하지 않는다** —
   *    잘라서 넣으면 부모가 누른 것과 다른 숫자가 칸에 남는다.
   */
  const bump = (a: number) => {
    const next = total + a;
    if (next > MAX_TOPUP) {
      // 🔴 넘긴 값을 보여 주고 상한을 말한다. 「안 됩니다」만 뜨면 왜인지 모른다
      alert(
        `한 번에 ${MAX_TOPUP.toLocaleString("ko-KR")}원까지 넣을 수 있어요.\n` +
        `지금 ${total.toLocaleString("ko-KR")}원에 ${a.toLocaleString("ko-KR")}원을 더하면 ` +
        `${next.toLocaleString("ko-KR")}원이 됩니다.`,
      );
      return;
    }
    setAmount(String(next));
  };

  return (
    <form action={action}>
      {/* 🔴 자주 쓰는 금액은 버튼 — 세 번 중 두 번은 이걸로 끝난다 */}
      <div className="grid grid-cols-3 gap-1.5">
        {TOPUP_AMOUNTS.map((a) => (
          <button
            key={a}
            // 🔴 `type="button"` 이어야 한다. 빼면 폼이 제출돼 예전 동작으로 돌아간다
            type="button"
            onClick={() => bump(a)}
            /**
             * 🔴 **막지 않는다 — 눌리고 알림이 떠야 한다** (사용자 요청).
             *
             *    한때 `disabled={total + a > MAX_TOPUP}` 을 걸었다. 그러면
             *    **알림이 영원히 안 뜬다** — 버튼이 안 눌리니 `bump` 가 안 불린다.
             *    상한을 배우는 자리가 사라지고 부모는 「왜 안 눌리지」만 남는다.
             */
            className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-sub tabular-nums text-ink-soft"
          >
            +{a.toLocaleString("ko-KR")}
          </button>
        ))}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <label className="sr-only" htmlFor="topup-amount">{labels.srLabel}</label>
        <input
          id="topup-amount" name="amount" type="number" inputMode="numeric"
          min={1} max={MAX_TOPUP} step={1} required placeholder={labels.placeholder}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          /**
           * 🔴 **`min-w-0` 이 있어야 좁은 폰에서 버튼이 안 밀린다.**
           *    flex 항목은 기본으로 자기 min-content 폭 아래로 줄지 않고,
           *    `input` 의 그 최소 폭은 브라우저 기본 `size` 라 제법 크다 —
           *    `flex-1` 을 줘도 입력칸이 안 줄고 줄 수 없는 버튼이 화면 밖으로 나간다.
           */
          className="min-h-touch min-w-0 flex-1 rounded-card border border-line bg-surface px-3 text-right text-body tabular-nums"
        />
        <span className="shrink-0 text-sub text-ink-mute">원</span>
        <button
          type="submit"
          // 🔴 빈 칸으로 누르면 서버까지 갔다가 오류로 돌아온다. 미리 막는다
          /**
           * 🔴 **`min={1}` 에 걸릴 값이면 아예 못 누르게 한다.**
           *
           *    전에는 `amount` 가 비었는지만 봤다. `0` 을 넣으면 「비지 않았다」라
           *    버튼이 켜지고, 누르면 **브라우저가 조용히 막고 자기 말풍선만** 띄운다 —
           *    화면은 아무 반응이 없어 「버튼이 안 눌린다」로 읽힌다.
           *    아이 화면에서 같은 일이 사진칸 `required` 로 실제 제보됐다.
           */
          disabled={total < 1 || total > MAX_TOPUP}
          className="min-h-touch shrink-0 rounded-card bg-primary px-4 text-sub font-bold text-white disabled:cursor-not-allowed disabled:bg-line-2 disabled:font-normal disabled:text-ink-mute"
        >
          {labels.submit}
        </button>
      </div>

      {/*
        🔴 **비울 방법이 있어야 한다.** 버튼이 더하기만 하면 45,000 을 만들다가
           틀렸을 때 칸을 손으로 지워야 한다 — 그건 방법이 아니라 요령이다.
      */}
      {total > 0 ? (
        <button
          type="button"
          onClick={() => setAmount("")}
          className="mt-1.5 min-h-touch w-full rounded-card border border-line text-cap text-ink-mute"
        >
          {labels.clear}
        </button>
      ) : null}

      {/* 🔴 직접 적어서 넘긴 경우 — 버튼은 미리 막지만 손으로 적는 것은 막을 수 없다 */}
      {total > MAX_TOPUP ? (
        <p className="mt-1 text-cap leading-relaxed text-miss">
          {labels.overMax}
        </p>
      ) : null}

      {/* 🔴 버튼이 바로 넣지 않는다는 것을 말한다 — 안 적으면 눌러 놓고 넣은 줄 안다 */}
      <p className="mt-1 text-cap leading-relaxed text-ink-mute">{labels.presetHint}</p>
      <p className="mt-0.5 text-cap leading-relaxed text-ink-mute">{labels.hint}</p>
    </form>
  );
}
