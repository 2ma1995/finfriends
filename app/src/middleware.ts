import { NextResponse, type NextRequest } from "next/server";
import { MODE_COOKIE, isGuardianPath, readMode } from "@/lib/session/device-mode";
// 🔴 값만 쓴다 — 미들웨어는 Edge 라 `child-mode-pin` 을 통째로 import 하면 안 된다(DB 를 문다)
const UNLOCK_COOKIE = "ff_unlock";

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
  matcher: ["/((?!_next/static|_next/image|models|thumbs|favicon.ico).*)"],
};
