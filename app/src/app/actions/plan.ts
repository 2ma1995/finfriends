"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { createPlanCard, recordActual } from "@/modules/plan";
import type { CategoryCode } from "@/contracts/plan";

/**
 * 계획 카드 저장 — PLN-001. **아이 화면의 첫 쓰기 기능이다.**
 *
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). Server Action 은 공개 엔드포인트와 동등하다 —
 *    화면에서 감췄다고 호출까지 막히는 것이 아니다.
 */
export async function savePlanCard(formData: FormData) {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fplan%2Fnew");

  const where = String(formData.get("where") ?? "").trim();
  const category = String(formData.get("category") ?? "") as CategoryCode;
  // 🔴 화면 규칙을 서버가 다시 본다. Server Action 은 공개 엔드포인트와 같다 (§6.6)
  const limitAmount = Math.floor(Number(formData.get("limitAmount") ?? 0));

  const back = String(formData.get("from") ?? "") === "home" ? "/child/home" : "/child/plan/new";

  /**
   * 🔴 **적은 것을 돌려준다.** 금액 하나가 틀렸다고 「어디서」까지 지우면
   *    아이는 처음부터 다시 적어야 한다 — 고치라고 해 놓고 고칠 것을 뺏는 셈이다.
   *
   *    예전엔 입력칸의 `min`·`max` 가 브라우저 수준에서 막아 여기까지 오지 않았다.
   *    그 검사를 뗐으니(D66) **되돌려주는 일은 이제 서버 몫이다.**
   */
  const keep = (reason: string) => {
    const q = new URLSearchParams({ error: reason });
    if (where) q.set("where", where);
    if (limitAmount > 0) q.set("amount", String(limitAmount));
    redirect(`${back}?${q}`);
  };

  if (!where || !category || !Number.isFinite(limitAmount) || limitAmount <= 0) keep("1");
  if (limitAmount > 1_000_000) keep("too_big");

  await createPlanCard(access.childId, {
    where, category, limitAmount,
    items: String(formData.get("items") ?? "") || undefined,
    // 🔴 아이 기기에서 적었으므로 아이다. 보호자가 대신 적는 경로는 보호자 화면에 따로 둔다
    author: "아이",
  });

  /**
   * 🔴 **적은 자리로 돌려보낸다.** 하교 알림 모달에서 적었는데 계획 카드 목록으로
   *    떨어지면 아이는 「내 방이 어디 갔지」가 된다. 온 곳을 폼이 들고 온다.
   */
  const from = String(formData.get("from") ?? "");
  redirect(from === "home" ? "/child/home?planned=1" : "/child/plan?saved=1");
}

/**
 * 「얼마 썼는지 적기」 → 회고로 — PLN-002 · PLN-003.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 */
export async function recordActualAction(formData: FormData) {
  const access = await currentChild();
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Fplan");

  const planCardId = String(formData.get("planCardId") ?? "");
  const r = await recordActual(
    access.childId,
    planCardId,
    Number(formData.get("actualAmount") ?? 0),
    String(formData.get("actualCategory") ?? ""),
    String(formData.get("cardTxnId") ?? "") || undefined,
  );

  revalidatePath("/child/plan");
  if (!r.ok) redirect(`/child/plan?error=${r.reason}`);
  // 적자마자 회고를 보여준다 — 적고 끝나면 「계획 ↔ 실제」가 아니라 그냥 기록이다
  redirect(`/child/retro/${r.recordId}${r.starred ? "?star=1" : ""}`);
}
