import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "핀프렌즈",
  description: "아이가 배운 것을 실제 돈 행동으로 잇고, 그 변화를 보호자가 읽는다",
};

// data-mode 를 여기서 주지 않는다. 세그먼트 레이아웃이 부여한다:
//   child/**   → fun      parent/**  → clean      consent/** → clean
// 한 페이지에 두 모드를 나란히 놓고 대조할 수 있어야 하므로 :root 가 아니라 래퍼가 갖는다.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
