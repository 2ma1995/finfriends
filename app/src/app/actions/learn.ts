"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentChild } from "@/lib/session/current-child";
import { getLesson, markLessonRead, nextLesson } from "@/modules/learning";
import { claimPractice } from "@/modules/mission";

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

/**
 * 「해봤어요」 — 배운 걸 실제로 한 것을 올린다. D16.
 *
 * 🔴 **퀴즈를 틀려도 여기로 별을 받을 수 있다.** 별은 지식이 아니라 행동에 붙는다.
 * 🔴 다만 **보호자가 승인해야 별이다.** 여기서 별을 주지 않는다.
 */
export async function claimPracticeAction(formData: FormData) {
  const access = await currentChild();
  const id = String(formData.get("lessonId") ?? "");
  const lesson = getLesson(id);
  if (!lesson) redirect("/child/learn");
  if (!access.ok) redirect("/child/locked?from=%2Fchild%2Flearn");

  await claimPractice(access.childId, access.guardianId, id);
  // 🔴 실천은 이제 한 화면에 모여 있다. 배우기 영역으로 보내면 아이는
  //    자기가 누른 결과를 못 보고 「눌렸나?」가 된다
  revalidatePath("/child/practice");
  revalidatePath("/child/learn");
  revalidatePath("/child/missions");
  revalidatePath("/child/home");
  redirect(`/child/practice?claimed=${lesson.topic.toLowerCase()}`);
}
