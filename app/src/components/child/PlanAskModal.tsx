"use client";

import { useState } from "react";
import { CATEGORIES } from "@/contracts/plan";
import { savePlanCard } from "@/app/actions/plan";
import { dismissPlanAskAction } from "@/app/actions/schedule";

/**
 * 하교 뒤 「오늘 쓸 계획 있니?」 — 어긋남 대장 D41.
 *
 * 🔴 **계획이 없을 때만 뜬다.** 뜰지 말지는 서버(`modules/schedule.shouldAsk`)가 정한다 —
 *    이 컴포넌트는 **뜨라고 하면 뜨는 것**뿐이다. 조건을 여기 두면 화면마다 갈라진다.
 *
 * 🔴 **닫을 수 있어야 한다.** 못 닫는 모달은 아이에게 벌이다. 「없어요」도, ✕ 도 연다 —
 *    다만 「없어요」는 **오늘은 다시 안 묻고**, ✕ 는 다음에 열면 또 묻는다. 다른 뜻이다.
 */
export function PlanAskModal({
  schoolEnd, title, body, yesLabel, noLabel, noHint, formTitle, closeLabel, labels, placeholders, submitLabel,
}: {
  schoolEnd: string;
  /** 🔴 `{time}` 자리표시자를 쓴다 — 문구는 fixture 가, 숫자는 여기가 갖는다 */
  title: string; body: string;
  yesLabel: string; noLabel: string; noHint: string;
  formTitle: string; closeLabel: string;
  labels: { where: string; what: string; amount: string };
  placeholders: { where: string; amount: string };
  submitLabel: string;
}) {
  const [open, setOpen] = useState(true);
  const [writing, setWriting] = useState(false);
  if (!open) return null;

  return (
    // 🔴 `<dialog>` 를 안 쓴다 — 브라우저 모달은 폼 제출·서버 액션과 섞이면 닫히는 시점이 엇갈린다
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pb-3 sm:items-center sm:pb-0">
      <div className="w-full max-w-[26rem] rounded-card border border-line bg-surface p-4 shadow-lg">
        <div className="flex items-start gap-2">
          <span className="text-[1.6em] leading-none">🏫</span>
          <div className="min-w-0 flex-1">
            <b className="block text-body">{title}</b>
            <p className="mt-1 text-sub leading-relaxed text-ink-mute">
              {body.replace("{time}", schoolEnd)}
            </p>
          </div>
          {/* ✕ 는 「지금 말고」다. 오늘 다시 물어도 되는 닫기 */}
          <button type="button" onClick={() => setOpen(false)} aria-label={closeLabel}
                  className="grid size-8 shrink-0 place-items-center rounded-card text-ink-mute">
            ✕
          </button>
        </div>

        {!writing ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setWriting(true)}
                      className="min-h-touch w-full min-w-0 rounded-card bg-primary text-body font-bold text-white">
                {yesLabel}
              </button>
              {/* 🔴 「없어요」는 **오늘은 끝**이다. 서버가 오늘 날짜를 적어 다시 안 묻는다 */}
              <form action={async () => { await dismissPlanAskAction(); setOpen(false); }}>
                <button type="submit" className="min-h-touch w-full rounded-card border border-line bg-surface text-body">
                  {noLabel}
                </button>
              </form>
            </div>
            <p className="mt-2 text-center text-cap text-ink-mute">{noHint}</p>
          </>
        ) : (
          <form action={savePlanCard} className="mt-3 grid gap-2">
            {/* 🔴 적고 나서 **온 자리로** 돌아간다 — 모달에서 적었는데 목록으로 떨어지면 길을 잃는다 */}
            <input type="hidden" name="from" value="home" />
            <p className="text-cap text-ink-mute">{formTitle}</p>

            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{labels.where}</span>
              <input name="where" required placeholder={placeholders.where} autoFocus
                     className="min-h-touch w-full min-w-0 rounded-card border border-line bg-canvas px-3 text-body" />
            </label>

            <div className="grid gap-1">
              <span className="text-cap text-ink-mute">{labels.what}</span>
              <ul className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map((c, i) => (
                  <li className="min-w-0" key={c.code}>
                    <label className="block cursor-pointer">
                      {/* 🔴 **`sr-only` 라디오에 `required` 를 걸지 않는다** (D66) — 안 보이는 컨트롤이라
                             브라우저가 말풍선 띄울 자리조차 없다. 아무 반응 없이 폼이 죽는다 */}
                      <input type="radio" name="category" value={c.code} defaultChecked={i === 0} className="peer sr-only" />
                      <span className="grid min-h-touch place-items-center rounded-card border border-line bg-canvas text-center text-cap peer-checked:border-primary-l peer-checked:bg-primary-bg peer-checked:font-bold">
                        <span className="text-[1.25em]">{c.icon}</span>{c.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <label className="grid gap-1">
              <span className="text-cap text-ink-mute">{labels.amount}</span>
              {/* 🔴 `step` 은 검사 도구가 아니다. 100 으로 두면 1500 이 조용히 막힌다 — 실제로 겪었다 */}
              <input name="limitAmount" type="number" inputMode="numeric"
                     step={1} placeholder={placeholders.amount}
                     className="min-h-touch w-full min-w-0 rounded-card border border-line bg-canvas px-3 text-right text-title font-bold tabular-nums" />
            </label>

            <button type="submit" className="mt-1 min-h-touch w-full rounded-card bg-primary text-body font-bold text-white">
              {submitLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
