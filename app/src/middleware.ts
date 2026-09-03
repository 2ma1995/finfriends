import { NextResponse, type NextRequest } from "next/server";
import { MODE_COOKIE, isGuardianPath, readMode } from "@/lib/session/device-mode";
// 🔴 값만 쓴다 — 미들웨어는 Edge 라 `child-mode-pin` 을 통째로 import 하면 안 된다(DB 를 문다)
const UNLOCK_COOKIE = "ff_unlock";
// 🔴 값만 쓴다 — 이름만 필요하고 세션 모듈을 물면 Edge 가 DB 를 문다
const GUARDIAN_COOKIE = "ff_guardian";
const DEVICE_COOKIE = "ff_device_token";

/**
 * 아동 모드 관문 — 어긋남 대장 D5.
 *
 * 아이 기기에서 `/parent/**` 를 **서버가 막는다.** 화면에서 링크를 지우는 것으로는 부족하다 —
 * 주소를 직접 치면 열린다.
 *
 * 🔴 여기는 **1차 관문**이다. 쿠키는 지울 수 있으므로, 보호자 화면의 Server Action 은
 *    각자 첫 줄에서 다시 인가를 확인한다(§6.6). 미들웨어만 믿지 않는다.
 */
export function middleware(req: NextRequest) {
  /**
   * 🔴 **처음 온 사람에게는 랜딩이 먼저다** (사용자 요청).
   *
   * 예전엔 `/` 가 곧장 `/login` 으로 보냈다 — **제품이 무엇인지 보기도 전에**
   * 로그인 화면이 나왔다. 아무도 모르는 서비스에서 그건 문을 잠그는 것과 같다.
   *
   * 🔴 **주소는 `/` 그대로 둔다.** 리다이렉트가 아니라 **rewrite** 다 —
   *    `/landing.html` 이 주소창에 보이면 공유할 때 이상하다.
   *
   * 🔴 **쿠키가 있으면 안 건다.** 그때는 `/` 의 서버 코드가 세션을 제대로 보고
   *    아이·보호자 화면으로 가른다. 쿠키는 힌트일 뿐이라 **여기서 인가를 판단하지
   *    않는다** — 랜딩은 누구에게나 공개된 마케팅 문서다.
   */
  if (req.nextUrl.pathname === "/"
      && !req.cookies.get(GUARDIAN_COOKIE)
      && !req.cookies.get(DEVICE_COOKIE)) {
    const res = NextResponse.rewrite(new URL("/landing.html", req.url));
    /**
     * 🔴 **랜딩은 브라우저에 저장시키지 않는다** (사용자 요청 · 어긋남 대장 D70).
     *
     *    기본값은 `public, max-age=0, must-revalidate` 였다. 「매번 물어보라」는 뜻이라
     *    이론상 최신이 와야 하는데, **실제로는 옛 랜딩이 계속 보였다.**
     *    사파리는 뒤로가기·홈 화면 앱에서 `must-revalidate` 를 자주 무시한다.
     *
     *    `?v=3` 같은 꼬리표를 붙이면 보이긴 했는데, 그건 **서버가 다른 것을 준 게 아니라
     *    브라우저 캐시 한 칸을 피해간 것**뿐이다 — `/` 와 `/?v=3` 의 ETag 가 같았다.
     *    주소에 꼬리표를 달아야 최신이 보이는 페이지는 남에게 보낼 수도 없다.
     *
     * 🔴 `no-store` 는 **랜딩에만** 건다. 아래 화면들은 각자 캐시 규칙이 있고,
     *    여기는 로그인 전 마케팅 문서 하나뿐이라 매번 받아도 값이 싸다.
     */
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  }

  const mode = readMode(req.cookies.get(MODE_COOKIE)?.value);
  if (mode !== "CHILD") return NextResponse.next();
  if (!isGuardianPath(req.nextUrl.pathname)) return NextResponse.next();

  /**
   * 🔴 **PIN 으로 잠깐 열어 둔 상태면 통과시킨다** (`D5` · 어긋남 대장 D41).
   *    쿠키는 `httpOnly` 이고 **10분이면 스스로 만료**된다.
   *
   * 🔴 이 쿠키만으로 부모 화면이 열리는 것은 아니다. 각 화면과 Server Action 이
   *    첫 줄에서 **보호자 세션을 다시 본다** (`§6.6` 규약 ②) —
   *    쿠키를 손으로 만들어 넣어도 세션이 없으면 아무것도 못 한다.
   *    여기는 1차 관문일 뿐이다.
   */
  if (req.cookies.get(UNLOCK_COOKIE)?.value === "1") return NextResponse.next();

  // 🔴 조용히 돌려보내지 않는다 — S5 가 「시도 0건」을 세는 항목이라 흔적이 남아야 한다.
  //    적재는 Route Handler 가 한다(미들웨어는 Edge 라 DB 를 직접 못 본다).
  const url = req.nextUrl.clone();
  url.pathname = "/child/locked";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 파일·이미지·모델은 통과시킨다
  /**
   * 🔴 **`api/cron` 은 미들웨어를 태우지 않는다** (D77). 배치가 두드리는 문이라
   *    쿠키가 없다 — 아동 모드 판정을 태울 이유가 없고, 태우면 «쿠키 없음»으로
   *    랜딩 rewrite 에 걸릴 여지가 생긴다. 그 문의 인가는 그 안의 열쇠가 한다.
   */
  matcher: ["/((?!_next/static|_next/image|api/cron|models|thumbs|favicon.ico).*)"],
};
