import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, verifyChildAccess } from "@/lib/session/device-session";
import { MODE_COOKIE } from "@/lib/session/device-mode";

/**
 * 아이 기기 등록 링크 — `/child/enter?t=<토큰>`.
 *
 * 🔴 **아이는 로그인하지 않는다** (S5). 보호자가 만든 링크를 아이 기기에서 한 번 열면
 *    그 기기가 아이 프로필에 묶인다. 부모 화면의 QR 초대가 결국 이 주소를 가리킨다.
 *
 * 🔴 **토큰을 먼저 확인하고 심는다.** 확인 없이 쿠키만 심으면 잘못된 토큰이 조용히
 *    남아 아이는 계속 잠금 화면만 본다 — 무엇이 틀렸는지 아무 데도 안 적힌다.
 *
 * 🔴 토큰은 **httpOnly** 로 심는다. 화면 스크립트가 읽을 이유가 없다.
 *
 * ⚠️ **주소에 토큰이 실린다.** 지금은 개발·시연용이라 이대로 두지만, 운영에서는
 *    **한 번만 쓰이고 짧게 사는 초대 코드**로 바꿔야 한다 — 주소는 기록에 남는다.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? undefined;
  const access = await verifyChildAccess(token);

  const url = req.nextUrl.clone();
  url.search = "";

  if (!access.ok) {
    // 무엇이 틀렸는지 잠금 화면이 말하게 한다
    url.pathname = "/child/locked";
    url.searchParams.set("reason", access.reason);
    return NextResponse.redirect(url);
  }

  url.pathname = "/child/home";
  const res = NextResponse.redirect(url);

  const common = { path: "/", sameSite: "lax" as const, maxAge: 180 * 24 * 60 * 60 };
  res.cookies.set(DEVICE_COOKIE, token!, { ...common, httpOnly: true });
  // 🔴 미들웨어가 읽는 값이라 httpOnly 가 아니다. **아이 신분이 아니라 모드 표시**일 뿐이고,
  //    실제 판정은 위 토큰으로 매번 다시 한다
  res.cookies.set(MODE_COOKIE, "CHILD", common);
  return res;
}
