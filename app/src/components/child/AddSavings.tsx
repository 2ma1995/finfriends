"use client";

import { useState, type ReactNode } from "react";

/**
 * 「예/적금 추가」 — 🔴 **폼을 접어 둔다** (사용자 요청).
 *
 * 예전엔 신청 폼이 통장에 **늘 펼쳐져** 있었다. 목표·종류·금액·기간·이자까지
 * 대여섯 칸이라 화면의 절반을 차지했고, **저금을 안 할 날에도 매일 거기 있었다.**
 * 저금은 한 달에 한 번 시작하는 일이지 매일 하는 일이 아니다.
 *
 * 🔴 **폼 자체는 서버가 그린다.** 이 컴포넌트는 **보일지 말지만** 정한다 —
 *    `children` 으로 받으므로 서버 액션도, 문구도 여기로 넘어오지 않는다.
 *
 * 🔴 **닫을 수 있어야 한다.** 열어 보고 「아 오늘은 아니다」가 되는 게 정상이다.
 */
export function AddSavings({
  label, title, closeLabel, children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
              className="mt-2 min-h-touch w-full rounded-card border border-dashed border-primary-l bg-primary-bg text-body font-bold text-primary-d">
        + {label}
      </button>

      {open ? (
        // 🔴 `<dialog>` 를 안 쓴다 — 브라우저 모달은 폼 제출·서버 액션과 닫히는 시점이 엇갈린다
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pb-3 sm:items-center sm:pb-0">
          <div className="max-h-[86vh] w-full max-w-[26rem] overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lg">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <b className="text-title">{title}</b>
              <button type="button" onClick={() => setOpen(false)} aria-label={closeLabel}
                      className="grid size-8 shrink-0 place-items-center rounded-card text-ink-mute">
                ✕
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
