"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { breakEarly, request } from "@/modules/savings";

/**
 * 우리 집 적금 — 아이 쪽. 어긋남 대장 D25.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 * 🔴 **아이는 신청과 해지만 한다.** 받아들이는 것과 만기 처리는 보호자다 —
 *    아이가 시작까지 하면 부모 돈으로 주는 이자를 아이가 정하는 셈이 된다.
 */
async function child() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fallowance");
  return access;
}

function back(q: string) {
  revalidatePath("/child/allowance");
  revalidatePath("/child/home");
  redirect(q ? `/child/allowance?${q}` : "/child/allowance");
}

export async function requestSavingsAction(formData: FormData) {
  const a = await child();
  const r = await request(
    a.childId, a.guardianId,
    String(formData.get("goal") ?? ""),
    Number(formData.get("amount") ?? 0),
    Number(formData.get("months") ?? 0),
    Number(formData.get("wantedPct") ?? NaN),
  );
  back(r.ok ? "asked=1" : `error=${r.reason}`);
}

/**
 * 🔴 중간에 깨는 것을 **막지 않는다.** 아이 돈이다.
 *    대신 이자가 없다는 걸 누르기 전에 화면이 말한다 — 자료가 가르치는 그대로다.
 */
export async function breakSavingsAction(formData: FormData) {
  const a = await child();
  await breakEarly(a.childId, String(formData.get("planId") ?? ""));
  back("broke=1");
}
