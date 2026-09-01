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

/**
 * 🔴 **적은 자리로 돌려보낸다.** 통장에서 적었는데 위시리스트 화면으로 떨어지면
 *    아이는 「내 통장이 어디 갔지」가 된다 — 하교 모달에서 겪은 것과 같은 모양이다.
 *    폼이 `from` 을 들고 온다.
 */
function back(query: string, from?: string) {
  const to = from === "allowance" ? "/child/allowance" : "/child/wishlist";
  revalidatePath("/child/wishlist");
  revalidatePath("/child/allowance");
  redirect(query ? `${to}?${query}` : to);
}

export async function addWishAction(formData: FormData) {
  const childId = await child();
  const r = await addWish(
    childId,
    String(formData.get("name") ?? ""),
    Number(formData.get("targetAmount") ?? 0),
  );
  back(r.ok ? "added=1" : `error=${r.reason}`, String(formData.get("from") ?? ""));
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
