import "server-only";
import { cookies } from "next/headers";
import { DEVICE_COOKIE, verifyChildAccess, type ChildAccess } from "./device-session";

/**
 * 지금 화면을 보는 아이가 누구인가 — 화면(RSC)이 부르는 유일한 진입점.
 *
 * 🔴 매 진입마다 **토큰 유효성과 동의 상태를 둘 다** 확인한다.
 *    동의를 캐시하면 보호자가 철회해도 아이 화면이 계속 열린다 (ACE-8.2).
 */
export async function currentChild(): Promise<ChildAccess> {
  const jar = await cookies();
  return verifyChildAccess(jar.get(DEVICE_COOKIE)?.value);
}
