"use server";

import { redirect } from "next/navigation";
import { currentChild } from "@/lib/session/current-child";
import { gradeQuiz } from "@/modules/quiz";

/**
 * 퀴즈 답 제출 — LRN-001.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 */
export async function submitAnswer(formData: FormData) {
  const access = await currentChild();
  const slug = String(formData.get("slug") ?? "earn");
  if (!access.ok) redirect(`/child/locked?from=%2Fchild%2Fquiz%2F${slug}`);

  const choice = String(formData.get("choice") ?? "");
  const r = await gradeQuiz(access.childId, slug, choice);

  const q = new URLSearchParams({
    r: r.correct ? "o" : "x",
    ...(r.starred ? { star: "1" } : {}),
  });
  redirect(`/child/quiz/${slug}?${q}`);
}
