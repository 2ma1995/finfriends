"use server";

import { revalidatePath } from "next/cache";
import { requireGuardian } from "@/lib/session/guardian-session";
import { removeSubscription, saveSubscription } from "@/lib/push";

/**
 * 웹 푸시 구독 — 어긋남 대장 D56.
 *
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). Server Action 은 공개 엔드포인트와 동등하다 —
 *    이걸 빠뜨리면 **아무나 남의 보호자 id 에 자기 기기를 붙여** 그 집 알림을 받는다.
 *    그래서 `guardianId` 를 인자로 받지 않는다. **세션에서 꺼낸다.**
 *
 * 🔴 FormData 가 아니라 값을 받는다. 구독 정보는 브라우저 API 가 만드는 객체라
 *    폼에 담을 수 없다 — 이 두 함수만 클라이언트에서 직접 부른다.
 */

export async function savePushAction(raw: string): Promise<{ ok: boolean }> {
  const g = await requireGuardian();

  // 🔴 클라이언트가 보낸 JSON 이다. 깨져 있어도 500 을 내지 않는다
  let sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    sub = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth) return { ok: false };

  const r = await saveSubscription(g.guardianId, {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  revalidatePath("/parent/mypage");
  return r;
}

export async function removePushAction(endpoint: string): Promise<{ ok: boolean }> {
  const g = await requireGuardian();
  if (typeof endpoint !== "string" || endpoint.length === 0) return { ok: false };
  // 🔴 `guardianId` 로 함께 좁힌다 — 남의 기기 구독을 지울 수 없게
  await removeSubscription(g.guardianId, endpoint);
  revalidatePath("/parent/mypage");
  return { ok: true };
}
