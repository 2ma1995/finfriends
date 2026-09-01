"use server";

import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { addEnvelope, allocate, editEnvelope, removeEnvelope, settlePayment } from "@/modules/envelope";
import { revalidateMoney } from "@/lib/revalidate/money";
import { getTxn, attach } from "@/modules/card";

/**
 * 봉투 — `FR-020` · `FR-021`.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 */
async function child() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fallowance");
  return access.childId;
}

function back(q: string) {
  revalidateMoney();
  // 🔴 돈 화면은 통장 하나다. 봉투도 저금도 기입장도 여기 있다
  redirect(q ? `/child/allowance?${q}` : "/child/allowance");
}

/** 🔴 합계가 쓸 수 있는 돈을 넘으면 **저장을 거부한다** (AC-020-1) */
export async function allocateAction(formData: FormData) {
  const childId = await child();

  const amounts: Record<string, number> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("env:")) continue;
    amounts[k.slice(4)] = Number(v) || 0;
  }

  const r = await allocate(childId, amounts);
  back(r.ok ? "saved=1" : `error=${r.reason}`);
}

/**
 * 예시 카드 결제를 봉투에 반영한다 — 실제 연동 전까지의 자리.
 * 🔴 **넘어도 결제는 통과한다.** 여기서 막으면 명세와 반대가 된다 (AC-021-2).
 */
export async function settleAction(formData: FormData) {
  const childId = await child();
  const txnId = String(formData.get("txnId") ?? "");

  const t = await getTxn(childId, txnId);
  if (!t) back("error=NO_ENVELOPE");

  const r = await settlePayment(childId, {
    txnId: t!.id, merchant: t!.merchant, category: t!.category, mcc: t!.mcc,
    amount: t!.amount, occurredAt: new Date(),
  });
  // 거래를 다 쓴 것으로 표시한다 — 같은 거래가 다시 목록에 뜨지 않게
  if (r.ok) await attach(childId, t!.id, t!.id);

  back(r.ok ? (r.within ? "spent=1" : `over=${r.overBy}`) : `error=${r.reason}`);
}

/**
 * 봉투 고치기 — 이름 · 그림 · **맡는 업종**.
 * 🔴 업종을 안 붙이면 **아무 결제도 그 봉투로 안 간다.** 화면이 그 사실을 말한다.
 */
export async function editEnvelopeAction(formData: FormData) {
  const childId = await child();
  const r = await editEnvelope(childId, String(formData.get("id") ?? ""), {
    name: String(formData.get("name") ?? ""),
    emoji: String(formData.get("emoji") ?? ""),
    categories: formData.getAll("categories").map(String),
  });
  back(r.ok ? "edited=1" : `error=${r.reason}`);
}

export async function addEnvelopeAction(formData: FormData) {
  const childId = await child();
  const r = await addEnvelope(childId, String(formData.get("name") ?? ""), String(formData.get("emoji") ?? "📦"));
  back(r.ok ? "added=1" : `error=${r.reason}`);
}

export async function removeEnvelopeAction(formData: FormData) {
  const childId = await child();
  const r = await removeEnvelope(childId, String(formData.get("id") ?? ""));
  back(r.ok ? "removed=1" : `error=${r.reason}`);
}
