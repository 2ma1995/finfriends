import type { NextResponse } from "next/server";
import { DEVICE_COOKIE } from "@/lib/session/device-session";
import { MODE_COOKIE } from "@/lib/session/device-mode";
import { UNLOCK_COOKIE } from "@/lib/session/child-mode-pin";
import { GUARDIAN_COOKIE } from "@/lib/session/guardian-session";

/**
 * 이 기기가 **자기 세션을 통째로 잊는다** — 어긋남 대장 D68 · D72.
 *
 * 🔴 **목록이 여기 하나뿐이어야 한다.** 지우는 자리가 둘이면 쿠키를 하나 더 늘렸을 때
 *    한쪽만 고쳐지고, 그 하나 때문에 기기가 계속 갇힌다 (`D24` 가 말하는 그 함정).
 *    부르는 곳은 둘이다 — 아이 기기가 해제됐을 때(`/child/left`)와
 *    죽은 세션으로 `/` 에 들어왔을 때(`/leave`).
 *
 * 🔴 **Route Handler 에서만 부를 수 있다.** 화면(RSC)은 쿠키를 지우지 못한다.
 */
export function forgetSession(res: NextResponse) {
  for (const name of [GUARDIAN_COOKIE, DEVICE_COOKIE, MODE_COOKIE, UNLOCK_COOKIE]) {
    res.cookies.delete(name);
  }
  return res;
}
