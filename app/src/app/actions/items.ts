"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { buyItem, equipCharacter, saveLayout, toggleWear } from "@/modules/items";

/**
 * 방·상점 — STR-003 · STR-005.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). Server Action 은 공개 엔드포인트와 같다.
 */
async function child(from: string) {
  const access = await currentChild();
  if (!access.ok) redirect(`/child/locked?from=${encodeURIComponent(from)}`);
  return access.childId;
}

function refresh() {
  revalidatePath("/child/shop");
  revalidatePath("/child/home");
}

export async function buyItemAction(formData: FormData) {
  const childId = await child("/child/shop");
  const itemId = String(formData.get("itemId") ?? "");
  const back = String(formData.get("back") ?? "/child/shop");

  const r = await buyItem(childId, itemId);
  refresh();
  redirect(r.ok ? `${back}&bought=${itemId}` : `${back}&failed=${r.reason}`);
}

export async function equipAction(formData: FormData) {
  const childId = await child("/child/shop");
  const itemId = String(formData.get("itemId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const back = String(formData.get("back") ?? "/child/shop");

  if (kind === "avatar") await equipCharacter(childId, itemId);
  if (kind === "socket") await toggleWear(childId, itemId);
  refresh();
  redirect(back);
}

/** 방 꾸미기에서 옮길 때마다 부른다 — 화면 이동이 없다 */
export async function saveLayoutAction(layout: Record<string, { x: number; z: number; ry: number; y?: number }>) {
  const childId = await child("/child/home");
  await saveLayout(childId, layout);
}
