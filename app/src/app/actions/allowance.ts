"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { requireGuardian } from "@/lib/session/guardian-session";
import { topUp } from "@/modules/allowance";

/**
 * 보호자가 용돈을 적는다 — D18.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). **보호자만** 용돈을 넣는다.
 * 🔴 앱은 돈을 옮기지 않는다. 실제 돈은 앱 밖에서 오간다 — 여기는 장부다.
 */
export async function topUpAction(formData: FormData) {
  const g = await requireGuardian();
  const child = await prisma.childAccount.findFirst({
    where: { guardianId: g.guardianId }, select: { id: true },
  });
  if (!child) redirect("/parent/allowance?error=1");

  const r = await topUp(
    child.id,
    Number(formData.get("amount") ?? 0),
    String(formData.get("memo") ?? "").trim(),
    // 같은 금액을 여러 번 줄 수 있다 — 매번 새 줄이다
    `topup:${randomUUID()}`,
  );

  revalidatePath("/parent/allowance");
  revalidatePath("/child/wishlist");
  revalidatePath("/child/plan");
  redirect(r.ok ? "/parent/allowance?saved=1" : "/parent/allowance?error=1");
}
