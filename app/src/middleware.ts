import { NextResponse, type NextRequest } from "next/server";
import { MODE_COOKIE, isGuardianPath, readMode } from "@/lib/session/device-mode";

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
