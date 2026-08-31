"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { addWish, deposit, raiseRank, removeWish } from "@/modules/wishlist";

/**
 * 갖고 싶은 것 — PRC-004.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). 한계 검사는 **모듈이** 한다 —
 *    화면 검사만 믿으면 Server Action 은 공개 엔드포인트와 같아서 그대로 통한다.
 */
async function child() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fwishlist");
  return access.childId;
}

function back(query: string) {
  revalidatePath("/child/wishlist");
  redirect(query ? `/child/wishlist?${query}` : "/child/wishlist");
}

export async function addWishAction(formData: FormData) {
  const childId = await child();
  const r = await addWish(
    childId,
    String(formData.get("name") ?? ""),
    Number(formData.get("targetAmount") ?? 0),
  );
  back(r.ok ? "added=1" : `error=${r.reason}`);
}

export async function depositAction(formData: FormData) {
  const childId = await child();
  const r = await deposit(
    childId,
    String(formData.get("wishId") ?? ""),
    Number(formData.get("amount") ?? 0),
  );
  back(r.ok ? "saved=1" : `error=${r.reason}`);
}

export async function removeWishAction(formData: FormData) {
  const childId = await child();
  await removeWish(childId, String(formData.get("wishId") ?? ""));
  back("");
}

export async function raiseRankAction(formData: FormData) {
  const childId = await child();
  const r = await raiseRank(childId, String(formData.get("wishId") ?? ""));
  back(r.ok ? "ranked=1" : `error=${r.reason}`);
}
