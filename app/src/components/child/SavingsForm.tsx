"use client";

import { useState } from "react";

/**
 * 저금 신청 폼 — `FR-031`.
 *
 * 🔴 **고른 것과 보이는 숫자가 같이 움직여야 한다.** 예전엔 이자 버튼이
 *    「10,000원에 500원」 고정이었다 — 아이가 12,000원을 모으는데 10,000원 기준을
 *    보여주면 **자기 이야기가 아니다.** 실제 모을 금액으로 계산해 보여준다.
 *
 * 🔴 **예금/적금을 고르면 칸이 바뀐다.** 예전엔 라디오와 별도로 「예금」을 펼치는
 *    접힌 상자가 따로 있었다 — 고르는 곳이 두 군데였고, 하나는 군더더기였다.
 *
 * 🔴 아이 화면에 **`%` 를 쓰지 않는다** (`AC-031-5`). 이자는 **받을 금액**으로만 말한다.
 */

type Kind = "INSTALLMENT" | "DEPOSIT";

/**
 * 🔴 **문자열만 받는다.** 문구를 만드는 함수는 서버에서 클라이언트로 넘길 수 없다 —
 *    넘기려다 화면이 통째로 500 이 났다. 조립은 이 안에서 한다.
 */
export type SavingsFormCopy = {
  goalLabel: string; goalPlaceholder: string;
  kindLabel: string;
  kinds: Record<Kind, { label: string; hint: string }>;
  perPeriodLabel: string; periodsLabel: string;
  amountLabel: string; monthsLabel: string;
  /** 「{n}주 동안 모으면 {won}원이 돼요」 */
  totalPreview: string;
  /** 「{won}원을 {n}달 동안 두는 거예요」 */
  depositPreview: string;
  wantLabel: string; wantWho: string;
  /** 「끝나면 {won}원을 더 받아요」 */
  interestPreview: string;
  noInterest: string;
  /** 「지금 쓸 수 있는 돈: {won}원」 */
  balanceHint: string;
  overBalance: string;
  ask: string;
};

/** 자리표시자를 채운다 — 문구는 fixture 가, 숫자는 여기가 갖는다 */
const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export function SavingsForm({
  action, copy, choices, houseRate, balance, limits,
}: {
  action: (formData: FormData) => void;
  copy: SavingsFormCopy;
  /** 아이가 골라 볼 수 있는 이자율 — 화면에는 **금액**으로만 나온다 */
  choices: readonly number[];
  houseRate: number | null;
  balance: number;
  limits: {
    minPerPeriod: number; minPeriods: number; maxPeriods: number;
    minAmount: number; maxMonths: number;
  };
}) {
  const [kind, setKind] = useState<Kind>("INSTALLMENT");
  const [perPeriod, setPerPeriod] = useState(limits.minPerPeriod);
  const [periods, setPeriods] = useState(12);
  const [amount, setAmount] = useState(limits.minAmount);
  const [months, setMonths] = useState(3);
  const [wanted, setWanted] = useState(houseRate ?? 5);

  const inst = kind === "INSTALLMENT";
  // 🔴 **실제로 모을 금액**이다. 이자를 여기에 곱해야 아이 이야기가 된다
  const total = inst ? perPeriod * periods : amount;
  const interest = Math.floor((total * wanted) / 100);
  const won = (n: number) => n.toLocaleString("ko-KR");

  return (
    <form action={action} className="mt-2 grid gap-2">
      <input type="hidden" name="kind" value={kind} />

      <label className="grid gap-1">
        <span className="text-cap text-ink-mute">{copy.goalLabel}</span>
        <input name="goal" required maxLength={30} placeholder={copy.goalPlaceholder}
               className="min-h-touch rounded-card border border-line bg-surface px-3 text-body" />
      </label>

      {/* 🔴 고르면 아래 칸이 바뀐다. 접힌 상자를 따로 두지 않는다 */}
      <div className="grid gap-1">
        <span className="text-cap text-ink-mute">{copy.kindLabel}</span>
        <ul className="grid grid-cols-2 gap-1.5">
          {(["INSTALLMENT", "DEPOSIT"] as const).map((k) => (
            <li key={k}>
              <button type="button" onClick={() => setKind(k)}
                      className={`grid min-h-touch w-full place-items-center rounded-card border py-1 text-center text-cap ${
                        kind === k ? "border-primary bg-primary-bg" : "border-line bg-surface"}`}>
                <b>{copy.kinds[k].label}</b>
                <span className="text-sub text-ink-mute">{copy.kinds[k].hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {inst ? (
        <>
          {/*
            🔴 **`min`·`max` 를 걸지 않는다** (어긋남 대장 D66).
               범위 밖 값을 넣으면 브라우저가 **조용히 막고 자기 말풍선만** 띄운다 —
               화면은 아무 반응이 없어 아이는 「버튼이 고장 났다」고 읽는다.

               `modules/savings.requestSavings` 가 전부 검사한다 —
               적으면 `BAD_AMOUNT`, 회차·개월이 범위 밖이면 `BAD_MONTHS`,
               잔액을 넘으면 `NOT_ENOUGH`. 문구는 셋 다 `allowance.fixture` 에 있고
               통장 화면 맨 위에 뜬다.

            🔴 **`step` 을 100 에서 1 로 내렸다.** `step` 은 증감 폭이 아니라 **검사 규칙**이다 —
               100 으로 두면 1,550원 같은 값이 조용히 막힌다. 실제로 겪은 함정이다.
          */}
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{copy.perPeriodLabel}</span>
              <input name="perPeriod" type="number" inputMode="numeric" step={1}
                     value={perPeriod} onChange={(e) => setPerPeriod(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-body tabular-nums" />
            </label>
            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{copy.periodsLabel}</span>
              <input name="periods" type="number" inputMode="numeric" step={1}
                     value={periods} onChange={(e) => setPeriods(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-body tabular-nums" />
            </label>
          </div>
          <p className="text-sub font-bold text-primary-d">
            {fill(copy.totalPreview, { n: String(periods), won: won(total) })}
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{copy.amountLabel}</span>
              <input name="amount" type="number" inputMode="numeric" step={1}
                     value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-body tabular-nums" />
            </label>
            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{copy.monthsLabel}</span>
              <input name="months" type="number" inputMode="numeric" step={1}
                     value={months} onChange={(e) => setMonths(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-body tabular-nums" />
            </label>
          </div>
          <p className="text-sub font-bold text-primary-d">
            {fill(copy.depositPreview, { n: String(months), won: won(total) })}
          </p>
        </>
      )}

      {/*
        🔴 **한도를 말해 준다.** `max` 를 뗐으니(D66) 브라우저가 대신 막아 주지 않는다 —
           대신 **누르기 전에** 얼마까지 되는지 보이고, 넘으면 그 자리에서 알려준다.
           막는 것은 여전히 서버(`NOT_ENOUGH`)다.
      */}
      <p className={`text-cap ${total > balance ? "font-bold text-miss" : "text-ink-mute"}`}>
        {total > balance ? copy.overBalance : fill(copy.balanceHint, { won: won(balance) })}
      </p>

      {/* 🔴 **내가 모을 금액 기준**으로 보여준다. `%` 는 쓰지 않는다 (AC-031-5) */}
      <div className="grid gap-1">
        <span className="text-cap text-ink-mute">{copy.wantLabel}</span>
        <input type="hidden" name="wantedPct" value={wanted} />
        <ul className="grid grid-cols-4 gap-1">
          {choices.map((pct) => (
            <li key={pct}>
              <button type="button" onClick={() => setWanted(pct)}
                      className={`grid min-h-touch w-full place-items-center rounded-card border text-sub tabular-nums ${
                        wanted === pct ? "border-primary bg-primary-bg font-bold" : "border-line bg-surface"}`}>
                {won(Math.floor((total * pct) / 100))}원
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sub font-bold text-star-d">
          {interest > 0 ? fill(copy.interestPreview, { won: won(interest) }) : copy.noInterest}
        </p>
        <p className="text-cap font-bold text-ink-soft">{copy.wantWho}</p>
      </div>

      {/*
        🔴 **한도를 넘으면 눌리기 전에 꺼진다 — 다만 이유가 바로 위에 있다.**
           `max` 를 뗐으니(D66) 그냥 두면 서버까지 갔다가 되돌아오는데,
           이 폼은 **목표 글까지 다시 적어야 한다.** 조용히 막는 것과 다른 점은
           버튼이 **눈에 보이게** 꺼지고(`opacity-40`) 바로 위 줄이
           「쓸 수 있는 돈보다 많아요. 줄여 볼래요?」라고 말한다는 것이다.
      */}
      <button disabled={total <= 0 || total > balance}
              className="min-h-touch w-full rounded-card bg-primary text-sub font-bold text-white disabled:opacity-40">
        {copy.ask}
      </button>
    </form>
  );
}
