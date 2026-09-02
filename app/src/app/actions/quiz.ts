"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentChild } from "@/lib/session/current-child";
import { gradeQuiz } from "@/modules/quiz";
import { canTakeQuiz } from "@/modules/learning";
import { quizTopic } from "@/modules/quiz";

/**
 * 퀴즈 답 제출 — LRN-001.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 */
export async function submitAnswer(formData: FormData) {
  const access = await currentChild();
  const slug = String(formData.get("slug") ?? "earn");
  const n = Number(formData.get("n") ?? 1) || 1;
  if (!access.ok) redirect(`/child/locked?from=%2Fchild%2Fquiz%2F${slug}`);

  /**
   * 🔴 **화면이 막은 것을 서버가 다시 본다** (SRS-Tech §6.6 · D65). 폼은 주소만 알면
   *    던질 수 있다 — 화면만 막으면 읽지 않고도 별을 받는다.
   */
  if (!(await canTakeQuiz(access.childId, quizTopic(slug)))) {
    redirect(`/child/learn/${slug}`);
  }

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
