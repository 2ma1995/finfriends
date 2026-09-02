import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "핀프렌즈",
  description: "아이가 배운 것을 실제 돈 행동으로 잇고, 그 변화를 보호자가 읽는다",

  /**
   * 🔴 **홈 화면에 추가했을 때 앱처럼 열리게 한다** (어긋남 대장 D67).
   *
   *    없으면 iOS 가 홈 화면 바로가기를 **주소창과 하단 툴바가 있는 Safari 화면**으로 연다.
   *    그러면 세로 공간을 툴바가 먹어서 하단 탭이 내용을 덮는다 — 실기기에서 그렇게 나왔다.
   *
   * 🔴 `statusBarStyle` 을 `default` 로 둔다. `black-translucent` 는 상태바 밑으로
   *    내용을 밀어 넣어서 시각(6:47)과 화면 제목이 겹친다.
   */
  appleWebApp: {
    capable: true,
    title: "핀프렌즈",
    statusBarStyle: "default",
  },

};

/**
 * 🔴 **`viewportFit: "cover"` 가 이 파일의 핵심이다** (D67).
 *
 *    이게 없으면 `env(safe-area-inset-bottom)` 이 **항상 0** 이다.
 *    하단 탭이 그 값으로 안전영역 칸을 만드는데(`ParentTabs` · `ChildTabs`),
 *    0 이면 칸이 무너져 홈 인디케이터 기기에서 탭이 화면 끝에 붙고
 *    마지막 내용이 가려진다.
 *
 * 🔴 확대를 막지 않는다. `maximumScale: 1` 이나 `userScalable: false` 를 쓰면
 *    글자를 키워 읽는 사람이 이 앱을 못 쓴다 — 금액을 다루는 화면이다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#FAF7F1" },
  ],
};

// data-mode 를 여기서 주지 않는다. 세그먼트 레이아웃이 부여한다:
//   child/**   → fun      parent/**  → clean      consent/** → clean
// 한 페이지에 두 모드를 나란히 놓고 대조할 수 있어야 하므로 :root 가 아니라 래퍼가 갖는다.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      {/*
        🔴 **구형 iOS 를 위해 애플 접두 이름을 직접 쓴다.**

           Next 의 `appleWebApp.capable` 은 표준 이름(`mobile-web-app-capable`)만 낸다.
           iOS 16.4 부터는 매니페스트의 `display: standalone` 을 보므로 그걸로 충분하지만,
           그 아래 버전은 **이 이름만** 본다.

           `metadata.other` 로는 안 된다 — Next 가 자기 `appleWebApp` 처리와 겹치는
           키를 버린다. React 가 트리의 `<meta>` 를 head 로 올려 주므로 여기 쓴다.
      */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <body>{children}</body>
    </html>
  );
}
