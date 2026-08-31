import type { ReactNode } from "react";

/**
 * 모드 래퍼 — 명세 §4 · §7.2
 *
 * data-mode 를 다는 유일한 곳이다. 아래 모든 컴포넌트는 자기가 어느 모드인지 모른 채
 * 같은 토큰 이름(`bg-canvas` · `text-ink` · `rounded-card`)만 쓴다.
 * 모바일 폭 390px 고정, 데스크톱에서 가운데 정렬.
 */
export function ModeFrame({ mode, children }: { mode: "fun" | "clean"; children: ReactNode }) {
  return (
    <div
      data-mode={mode}
      className="mx-auto min-h-full w-full max-w-frame bg-canvas text-body text-ink"
    >
      {children}
    </div>
  );
}
