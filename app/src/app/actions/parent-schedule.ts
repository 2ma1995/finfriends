"use server";

import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/session/guardian-session";
import { findChild } from "@/modules/consent";
import { setSchoolEndAction } from "@/app/actions/schedule";

/**
 * 하교 시각 — 부모 화면에서 폼으로 받는다. `FR` 신규 · 어긋남 대장 D41.
 *
 * 🔴 **폼에서 온 `childId` 를 쓰지 않는다.** 세션의 보호자에게서 아이를 찾아 그 id 를 쓴다 —
 *    폼 값을 믿으면 남의 아이 하교 시각을 바꿀 수 있다.
 *    (아이 화면 쪽 액션도 안에서 소유를 다시 본다. 두 겹이다.)
 */
export async function saveSchoolEndAction(formData: FormData) {
  const g = await requireGuardian();
  const child = await findChild(g.guardianId);
  if (!child) redirect("/parent/mypage?schoolErr=NO_CHILD");

  const r = await setSchoolEndAction(child.id, String(formData.get("clock") ?? ""));
  redirect(r.ok ? "/parent/mypage?school=set" : `/parent/mypage?schoolErr=${r.reason}`);
}
