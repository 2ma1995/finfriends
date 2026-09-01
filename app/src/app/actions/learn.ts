"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentChild } from "@/lib/session/current-child";
import { canOpenLesson, getLesson, markLessonRead } from "@/modules/learning";
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

  const topic = lesson.topic.toLowerCase();

  /**
   * 🔴 **다음 편으로 보내지 않는다** (D47). 예전엔 다 읽으면 곧장 다음 편을 열어서
   *    아이가 **한 자리에서 그 영역을 다 읽을 수 있었다.** 「매일 조금씩」이 리듬인데
   *    몰아 읽으면 다음 날 열 이유가 없어진다.
   *
   * 🔴 **읽기 다음은 문제다.** 읽을거리 · 문제 · 실천이 각각 하루 하나이고
   *    그 순서가 이 제품의 하루다. 배운 걸 바로 써 보게 퀴즈로 보낸다.
   */
  // 🔴 화면이 잠근 것을 서버가 다시 본다 — 폼은 주소만 알면 던질 수 있다 (§6.6)
  if (!(await canOpenLesson(access.childId, id))) redirect(`/child/learn/${topic}`);

  await markLessonRead(access.childId, id);
  revalidatePath("/child/learn");
  revalidatePath("/child/practice");

  redirect(`/child/quiz/${topic}?n=1`);
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

  /**
   * 🔴 **영역마다 하루 하나다** (D47). `claimPractice` 가 `false` 를 돌려주면
   *    오늘 그 영역 실천을 이미 올렸다는 뜻이다 — **오류가 아니다.**
   *    화면이 이미 「오늘 실천 다 했어요」를 보여주고 있으므로 조용히 돌아간다.
   */
  await claimPractice(access.childId, access.guardianId, id);
  // 🔴 실천은 이제 한 화면에 모여 있다. 배우기 영역으로 보내면 아이는
  //    자기가 누른 결과를 못 보고 「눌렸나?」가 된다
  revalidatePath("/child/practice");
  revalidatePath("/child/learn");
  revalidatePath("/child/missions");
  revalidatePath("/child/home");
  redirect(`/child/practice?claimed=${lesson.topic.toLowerCase()}`);
}
