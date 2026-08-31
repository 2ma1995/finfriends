"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentChild } from "@/lib/session/current-child";
import { getLesson, markLessonRead, nextLesson } from "@/modules/learning";

/**
 * 「다 읽었어요」 — LRN-001.
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6).
 * 🔴 **읽기로는 별을 주지 않는다.** 주면 아이는 넘기기만 한다 — SRS 트리거에도 없다.
 */
export async function finishLessonAction(formData: FormData) {
  const access = await currentChild();
  const id = String(formData.get("lessonId") ?? "");
  const lesson = getLesson(id);
  if (!lesson) redirect("/child/learn");
  if (!access.ok) redirect(`/child/locked?from=%2Fchild%2Flearn`);

  await markLessonRead(access.childId, id);
  revalidatePath("/child/learn");

  const next = nextLesson(id);
  const topic = lesson.topic.toLowerCase();
  // 마지막 편을 읽었으면 퀴즈로 보낸다 — 배운 걸 바로 써 본다
  redirect(next ? `/child/learn/${topic}/${next.id}` : `/child/quiz/${topic}?n=1`);
}
