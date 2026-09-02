import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/session/device-session";
import { MODE_COOKIE } from "@/lib/session/device-mode";
import { consumeInvite } from "@/lib/session/child-invite";
import { GUARDIAN_COOKIE, closeSession } from "@/lib/session/guardian-session";

/**
 * 아이 기기 등록 — `/child/enter?t=<초대 코드>` · `FR-002`.
 *
 * 🔴 **아이는 로그인하지 않는다** (`CON-01`). 보호자가 만든 링크를 아이 기기에서 한 번 열면
 *    그 기기가 아이 프로필에 묶인다. 부모 화면의 QR 초대가 이 주소를 가리킨다.
 *
 * 🔴 **주소에 실리는 것은 기기 토큰이 아니라 24시간짜리 1회용 코드**다.
 *    오래 사는 자격증명을 주소에 실으면 기록·공유 이력에 남아 계속 유효하다.
 *    기기 토큰은 `consumeInvite` 가 **그 자리에서 새로 발급**한다.
 *
 * 🔴 **이 기기의 보호자 세션을 끝낸다.** 여기가 기기가 실제로 아이 것이 되는 순간이다 —
 *    안 끝내면 **아이 손에 살아 있는 보호자 세션이 쥐어진다.** 부모 기기로 열든
 *    아이 기기로 열든 **같은 길**로 들어오므로(`AC-002-3`) 여기서 해야 한다.
 *
 * 🔴 **실패 사유를 뭉뚱그리지 않는다.** 「만료」와 「이미 연결됨」은 아이에게 다른 말이다 —
 *    하나는 다시 요청해야 하고 하나는 이미 된 것이다 (`AC-002-2`).
 */
/**
 * 🔴 **링크를 통째로 붙여넣어도 받는다** (어긋남 대장 D67).
 *
 *    랜딩의 「초대 링크를 받았나요?」 칸에 아이가 넣는 것은 대개 **주소 전체**다 —
 *    코드만 골라내라는 건 어른의 순서다. 통째로 오면 `t=` 를 꺼낸다.
 *
 * 🔴 주소로 안 보이면 **그대로 코드로 본다.** 부모가 코드만 불러 줄 수도 있다.
 */
function tokenFrom(raw: string | null): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (!v.includes("t=")) return v;
  // `?t=…` · `&t=…` 어느 쪽이든. 뒤에 딴 것이 붙어 있어도 첫 조각만 쓴다
  const m = /[?&]t=([^&#\s]+)/.exec(v) ?? /(?:^|\b)t=([^&#\s]+)/.exec(v);
  return m ? decodeURIComponent(m[1]) : v;
}

export async function GET(req: NextRequest) {
  const token = tokenFrom(req.nextUrl.searchParams.get("t"));
  const r = await consumeInvite(token);

  const url = req.nextUrl.clone();
  url.search = "";

  if (!r.ok) {
    url.pathname = "/child/locked";
    url.searchParams.set("reason", r.reason);
    return NextResponse.redirect(url);
  }

  url.pathname = "/child/home";
  const res = NextResponse.redirect(url);

  /**
   * 🔴 **`secure` 를 빠뜨리고 있었다** (어긋남 대장 D66).
   *
   *    보호자 세션 쿠키(`actions/auth.ts`)는 처음부터 `secure` 를 붙였는데
   *    **기기 토큰과 모드 표시만 빠져 있었다.** 기기 토큰은 180일을 사는
   *    아이 화면 열쇠다 — 평문으로 한 번 새면 그동안 계속 유효하다.
   *
   *    로컬(`http://localhost`)에서는 켜면 쿠키가 아예 안 붙으므로 운영에서만 켠다.
   */
  const common = {
    path: "/", sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  res.cookies.set(DEVICE_COOKIE, r.token, {
    ...common, httpOnly: true, expires: r.expiresAt,
  });
  // 🔴 미들웨어가 읽는 값이라 httpOnly 가 아니다. **아이 신분이 아니라 모드 표시**일 뿐이고,
  //    실제 판정은 위 기기 토큰으로 매번 다시 한다
  res.cookies.set(MODE_COOKIE, "CHILD", { ...common, expires: r.expiresAt });

  // 🔴 보호자 세션을 끝낸다. 쿠키만 지우면 서버 세션이 살아 있다
  const guardianToken = req.cookies.get(GUARDIAN_COOKIE)?.value;
  if (guardianToken) {
    await closeSession(guardianToken);
    res.cookies.delete(GUARDIAN_COOKIE);
  }

  return res;
}
