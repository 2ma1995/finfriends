"use client";

import { useState, type ReactNode } from "react";

/**
 * 「+ 추가」 버튼과 그 폼 — 🔴 **폼을 접어 둔다** (사용자 요청).
 *
 * 저금 신청도 갖고 싶은 것 추가도 **늘 펼쳐져** 있었다. 대여섯 칸짜리 폼이
 * 화면의 절반을 차지한 채 **안 할 날에도 매일 거기 있었다.**
 * 둘 다 **가끔 하는 일**이지 매일 하는 일이 아니다.
 *
 * 🔴 **폼 자체는 서버가 그린다.** 이 컴포넌트는 **보일지 말지만** 정한다 —
 *    `children` 으로 받으므로 서버 액션도, 문구도 여기로 넘어오지 않는다.
 *
 * 🔴 **닫을 수 있어야 한다.** 열어 보고 「아 오늘은 아니다」가 되는 게 정상이다.
 *
 * 🔴 **두 곳이 같은 것을 쓴다.** 베껴 두면 닫기 버튼·스크롤 처리가 한쪽만 고쳐진다.
 */
export function AddModal({
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
