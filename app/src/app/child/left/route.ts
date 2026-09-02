import { NextResponse, type NextRequest } from "next/server";
import { forgetSession } from "@/lib/session/forget";

/**
 * 아이 기기 연결 끊기 — 어긋남 대장 D68.
 *
 * 🔴 **부모가 「이 기기 해제」를 누르면 서버 세션만 죽고 기기의 쿠키는 남았다.**
 *
 *    그러면 그 기기가 **갇힌다.** 모드 쿠키가 계속 「나는 아이 기기」라고 말하므로
 *    미들웨어가 부모 화면을 막고(「여긴 어른 화면이에요」), 아이 화면은 토큰이
 *    죽어서 「부모님이 이 기기를 등록해 주셔야 열려요」만 띄운다.
 *    **어느 쪽으로도 나갈 수 없다.** 실기기에서 그렇게 나왔다.
 *
 * 🔴 **부모 쪽에서는 지울 수 없다.** 해제는 부모 브라우저에서 일어나고,
 *    서버는 **다른 기기의 쿠키를 지우지 못한다.** 그래서 아이 기기가
 *    **다음 진입에서 스스로 푼다** — 아이 레이아웃이 여기로 보낸다.
 *
 * 🔴 **Route Handler 여야 한다.** 화면(RSC)은 쿠키를 지울 수 없다.
 *
 * 🔴 `/` 로 보낸다. 쿠키가 없어진 상태라 그 화면이 알아서 갈라 준다 —
 *    초대 링크를 다시 받으면 아이 방으로, 부모면 로그인으로.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  // 🔴 지우는 목록은 `lib/session/forget` 하나뿐이다. 여기에 또 적으면
  //    쿠키를 하나 늘렸을 때 한쪽만 고쳐지고 기기가 계속 갇힌다 (D24)
  return forgetSession(NextResponse.redirect(url));
}
