"use server";

import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/session/guardian-session";
import { accept, complete, reject } from "@/modules/savings";
import { revalidateMoneyAndStars } from "@/lib/revalidate/money";

/**
 * 우리 집 적금 — 보호자 쪽. 어긋남 대장 D25.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). **받아들이는 것은 보호자만 한다** —
 *    아이가 스스로 시작하면 부모 돈으로 주는 이자를 아이가 정하는 셈이 된다.
 */
function back(q: string) {
  // 🔴 돈과 별이 함께 움직인다 — 가입 ⭐1 · 만기 ⭐10.
  //    부모가 눌렀는데 아이 화면이 그대로면 아이는 아직 기다리는 줄 안다
  revalidateMoneyAndStars();
  redirect(q ? `/parent/bank/savings?${q}` : "/parent/bank/savings");
}

export async function acceptSavingsAction(formData: FormData) {
  const g = await requireGuardian();
  const pct = Number(formData.get("pct") ?? NaN);
  const r = await accept(
    g.guardianId,
    String(formData.get("planId") ?? ""),
    Number.isFinite(pct) ? pct : undefined,
  );
  back(r.ok ? "accepted=1" : `error=${r.reason}`);
}

export async function rejectSavingsAction(formData: FormData) {
  const g = await requireGuardian();
  const r = await reject(
    g.guardianId,
    String(formData.get("planId") ?? ""),
    String(formData.get("reason") ?? ""),
  );
  back(r.ok ? "rejected=1" : `error=${r.reason}`);
}

/** 만기 처리 — 🔴 만기 전이면 모듈이 거부한다. 화면만 감추면 요청은 그대로 통한다 */
export async function completeSavingsAction(formData: FormData) {
  const g = await requireGuardian();
  const r = await complete(g.guardianId, String(formData.get("planId") ?? ""));
  back(r.ok ? "done=1" : `error=${r.reason}`);
}
