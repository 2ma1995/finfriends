import type { MetadataRoute } from "next";

/**
 * 웹 앱 매니페스트 — 어긋남 대장 D67.
 *
 * 🔴 **없어서 홈 화면 바로가기가 Safari 화면으로 열렸다.** 주소창과 하단 툴바가
 *    세로 공간을 먹으니 하단 탭이 마지막 내용을 덮었다 — 실기기에서 그렇게 나왔다.
 *    `display: "standalone"` 이 그 크롬을 없앤다.
 *
 * 🔴 **시작점은 `/` 다.** 그 화면이 기기를 보고 갈라 준다 —
 *    아이 기기면 `/child/home`, 보호자면 착지 화면, 아니면 로그인
 *    (`app/page.tsx`). 그래서 부모 폰과 아이 폰이 **같은 바로가기**를 쓴다.
 *
 * 🔴 아이콘은 푸시 알림용으로 만든 것을 그대로 쓴다 (D56) —
 *    두 벌을 두면 한쪽만 바뀐다.
 *
 * 🔴 `orientation` 을 고정하지 않는다. 태블릿을 가로로 쓰는 집이 있고,
 *    화면을 눕히지 못하게 할 이유가 없다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "핀프렌즈",
    short_name: "핀프렌즈",
    description: "아이가 배운 것을 실제 돈 행동으로 잇고, 그 변화를 보호자가 읽는다",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F1",
    theme_color: "#FAF7F1",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
