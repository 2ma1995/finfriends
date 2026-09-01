"use server";

import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { allocate, settlePayment } from "@/modules/envelope";
import { revalidateMoney } from "@/lib/revalidate/money";
import { getTxn, attach } from "@/modules/card";

/**
 * 봉투 — `FR-020` · `FR-021`.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 */
async function child() {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fenvelopes");
  return access.childId;
}

function back(q: string) {
  revalidateMoney();
  redirect(q ? `/child/envelopes?${q}` : "/child/envelopes");
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
    txnId: t!.id, merchant: t!.merchant, category: t!.category,
    amount: t!.amount, occurredAt: new Date(),
  });
  // 거래를 다 쓴 것으로 표시한다 — 같은 거래가 다시 목록에 뜨지 않게
  if (r.ok) await attach(childId, t!.id, t!.id);

  back(r.ok ? (r.within ? "spent=1" : `over=${r.overBy}`) : `error=${r.reason}`);
}
