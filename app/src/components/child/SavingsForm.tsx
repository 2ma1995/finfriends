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
        <span className="text-[0.72em] text-ink-mute">{copy.goalLabel}</span>
        <input name="goal" required maxLength={30} placeholder={copy.goalPlaceholder}
               className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.9em]" />
      </label>

      {/* 🔴 고르면 아래 칸이 바뀐다. 접힌 상자를 따로 두지 않는다 */}
      <div className="grid gap-1">
        <span className="text-[0.72em] text-ink-mute">{copy.kindLabel}</span>
        <ul className="grid grid-cols-2 gap-1.5">
          {(["INSTALLMENT", "DEPOSIT"] as const).map((k) => (
            <li key={k}>
              <button type="button" onClick={() => setKind(k)}
                      className={`grid min-h-touch w-full place-items-center rounded-card border py-1 text-center text-[0.76em] ${
                        kind === k ? "border-primary bg-primary-bg" : "border-line bg-surface"}`}>
                <b>{copy.kinds[k].label}</b>
                <span className="text-[0.86em] text-ink-mute">{copy.kinds[k].hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {inst ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-[0.72em] text-ink-mute">{copy.perPeriodLabel}</span>
              <input name="perPeriod" type="number" inputMode="numeric" step={100}
                     min={limits.minPerPeriod} max={Math.max(limits.minPerPeriod, balance)}
                     value={perPeriod} onChange={(e) => setPerPeriod(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
            </label>
            <label className="grid gap-1">
              <span className="text-[0.72em] text-ink-mute">{copy.periodsLabel}</span>
              <input name="periods" type="number" inputMode="numeric" step={1}
                     min={limits.minPeriods} max={limits.maxPeriods}
                     value={periods} onChange={(e) => setPeriods(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
            </label>
          </div>
          <p className="text-[0.8em] font-bold text-primary-d">
            {fill(copy.totalPreview, { n: String(periods), won: won(total) })}
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-[0.72em] text-ink-mute">{copy.amountLabel}</span>
              <input name="amount" type="number" inputMode="numeric" step={100}
                     min={limits.minAmount} max={Math.max(limits.minAmount, balance)}
                     value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
            </label>
            <label className="grid gap-1">
              <span className="text-[0.72em] text-ink-mute">{copy.monthsLabel}</span>
              <input name="months" type="number" inputMode="numeric" step={1}
                     min={1} max={limits.maxMonths}
                     value={months} onChange={(e) => setMonths(Number(e.target.value) || 0)}
                     className="min-h-touch rounded-card border border-line bg-surface px-2 text-right text-[0.9em] tabular-nums" />
            </label>
          </div>
          <p className="text-[0.8em] font-bold text-primary-d">
            {fill(copy.depositPreview, { n: String(months), won: won(total) })}
          </p>
        </>
      )}

      {/* 🔴 **내가 모을 금액 기준**으로 보여준다. `%` 는 쓰지 않는다 (AC-031-5) */}
      <div className="grid gap-1">
        <span className="text-[0.72em] text-ink-mute">{copy.wantLabel}</span>
        <input type="hidden" name="wantedPct" value={wanted} />
        <ul className="grid grid-cols-4 gap-1">
          {choices.map((pct) => (
            <li key={pct}>
              <button type="button" onClick={() => setWanted(pct)}
                      className={`grid min-h-touch w-full place-items-center rounded-card border text-[0.78em] tabular-nums ${
                        wanted === pct ? "border-primary bg-primary-bg font-bold" : "border-line bg-surface"}`}>
                {won(Math.floor((total * pct) / 100))}원
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[0.8em] font-bold text-star-d">
          {interest > 0 ? fill(copy.interestPreview, { won: won(interest) }) : copy.noInterest}
        </p>
        <p className="text-[0.72em] font-bold text-ink-soft">{copy.wantWho}</p>
      </div>

      <button disabled={total <= 0}
              className="min-h-touch w-full rounded-card bg-primary text-[0.88em] font-bold text-white disabled:opacity-40">
        {copy.ask}
      </button>
    </form>
  );
}
