"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentGuardian } from "@/lib/session/guardian-session";
import { findChild } from "@/modules/consent";
import { createPlanCard } from "@/modules/plan";
import type { CategoryCode } from "@/contracts/plan";

/**
 * 보호자가 **첫 계획 카드를 대신 적는다** — 온보딩 5단계 · 어긋남 대장 D43.
 *
 * 🔴 **평소에 적는 사람은 아이다.** 이 길은 「한 장을 같이 적어 보는」 자리다 —
 *    아이가 계획 카드가 무엇인지 모르는 채로 시작하지 않게 하려는 것이고,
 *    그래서 `author` 에 **보호자로 남는다.** 누가 적었는지 지우면 나중에
 *    아이의 실천을 셀 때 부모가 적은 것까지 섞인다.
 *
 * 🔴 첫 줄에서 인가를 확인한다 (SRS-Tech §6.6 규약 ②).
 * 🔴 **`childId` 를 폼에서 받지 않는다.** 세션의 보호자에게서 찾는다 —
 *    받으면 남의 아이 이름으로 계획 카드를 만들 수 있다.
 */
export async function saveGuardianPlanCard(formData: FormData) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const child = await findChild(guardian.guardianId);
  if (!child) redirect("/parent/child/new");

  const where = String(formData.get("where") ?? "").trim();
  const category = String(formData.get("category") ?? "") as CategoryCode;
  const limitAmount = Math.floor(Number(formData.get("limitAmount") ?? 0));

  if (!where || !category || !Number.isFinite(limitAmount) || limitAmount <= 0) {
    redirect("/parent/plan/new?error=1");
  }
  if (limitAmount > 1_000_000) {
    redirect("/parent/plan/new?error=too_big");
  }

  await createPlanCard(child.id, {
    where, category, limitAmount,
    items: String(formData.get("items") ?? "") || undefined,
    author: "보호자",
  });

  // 아이 화면이 바로 본다 — 오늘 카드가 생겼으므로 하교 모달도 더는 묻지 않는다 (D41)
  revalidatePath("/child/plan");
  revalidatePath("/child/home");
  redirect("/parent/onboarding?planned=1");
}
