"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentChild } from "@/lib/session/current-child";
import { gradeQuiz } from "@/modules/quiz";

/**
 * 퀴즈 답 제출 — LRN-001.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 */
export async function submitAnswer(formData: FormData) {
  const access = await currentChild();
  const slug = String(formData.get("slug") ?? "earn");
  const n = Number(formData.get("n") ?? 1) || 1;
  if (!access.ok) redirect(`/child/locked?from=%2Fchild%2Fquiz%2F${slug}`);

  const choice = String(formData.get("choice") ?? "");
  const r = await gradeQuiz(access.childId, slug, n, choice);

  revalidatePath("/child/learn");
  const q = new URLSearchParams({
    n: String(n),
    r: r.correct ? "o" : "x",
    ...(r.starred ? { star: "1" } : {}),
    ...(r.limitReached ? { limit: "1" } : {}),
  });
  redirect(`/child/quiz/${slug}?${q}`);
}
