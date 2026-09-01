"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireGuardian } from "@/lib/session/guardian-session";
import { DEVICE_COOKIE } from "@/lib/session/device-session";
import { clearChildModePin, relock, setChildModePin, unlockWithPin } from "@/lib/session/child-mode-pin";

/**
 * 아동 모드 PIN — `D5` · 어긋남 대장 D41.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). Server Action 은 공개 엔드포인트와 동등하다.
 */

/** PIN 정하기 — 보호자만 */
export async function setPinAction(formData: FormData) {
  const g = await requireGuardian();
  const r = await setChildModePin(g.guardianId, String(formData.get("pin") ?? ""));
  revalidatePath("/parent/mypage");
  redirect(r.ok ? "/parent/mypage?pin=set" : `/parent/mypage?pinErr=${r.reason}`);
}

/** PIN 지우기 — 지우면 아동 모드는 다시 로그인으로만 풀린다 */
export async function clearPinAction() {
  const g = await requireGuardian();
  await clearChildModePin(g.guardianId);
  revalidatePath("/parent/mypage");
  redirect("/parent/mypage?pin=cleared");
}

/**
 * 아이 기기에서 PIN 으로 잠깐 연다.
 *
 * 🔴 **여기서는 `requireGuardian` 을 쓸 수 없다.** 아동 모드에는 보호자 세션이 없다 —
 *    있으면 그것이 `D27` 이 막으려던 상황이다. 인가는 **기기 토큰**이 대신한다.
 *    그 토큰이 어느 보호자의 것인지는 `device_sessions` 가 안다.
 */
export async function unlockAction(formData: FormData) {
  const jar = await cookies();
  const r = await unlockWithPin(jar.get(DEVICE_COOKIE)?.value, String(formData.get("pin") ?? ""));

  if (r.ok) redirect("/parent/tree");
  const q = new URLSearchParams({ err: r.reason });
  if (r.reason === "WRONG" && r.triesLeft !== undefined) q.set("left", String(r.triesLeft));
  redirect(`/unlock?${q}`);
}

/** 🔴 부모가 볼 일을 마치면 아이 기기로 돌려놓는다. 자리를 뜨면 그때까지 열려 있다 */
export async function relockAction() {
  await relock();
  redirect("/child/home");
}
