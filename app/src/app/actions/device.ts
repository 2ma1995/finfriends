"use server";

import { headers } from "next/headers";
import { prisma } from "@/db";
import { requireGuardian } from "@/lib/session/guardian-session";
import { issueInvite } from "@/lib/session/child-invite";

/**
 * 🔴 **`registerChildDeviceAction` 을 지웠다** (어긋남 대장 D66).
 *
 *    그 액션은 초대 코드를 만들고 `redirect("/child/enter?t=…")` 했다.
 *    `/child/enter` 는 **쿠키를 굽는 Route Handler** 인데, Server Action 의
 *    `redirect` 는 문서 이동이 아니라 **클라이언트 라우터 이동**이다 —
 *    라우터가 등록 «전»에 받아 둔 화면을 캐시에서 돌려주면
 *    부모가 눌러도 「아직 준비가 안 됐어요」가 계속 뜬다.
 *    실기기 운영에서 그렇게 나왔다.
 *
 *    이제 `/join` 이 코드를 만들어 **`method="get"` 폼**에 실어 보낸다 —
 *    진짜 문서 이동이라 라우터가 끼지 않는다.
 *
 * 🔴 **길은 하나다.** 「기기 등록」 버튼과 초대 링크가 **같은 코드를 같은 방식으로**
 *    소진한다 (`AC-002-3`). 길이 둘이면 한쪽만 고쳐진다 — `D24` 에서 겪었고
 *    이번에도 그 두 번째 길이 문제였다.
 */

/**
 * 초대 **링크를 만들어 돌려준다** — 어긋남 대장 D63.
 *
 * 🔴 **아이 폰에서 부모 비밀번호를 치게 하고 있었다.** 기존 등록은 누른 브라우저를
 *    곧장 아이 기기로 바꾼다. 그래서 아이 폰에 넘기려면 **그 폰에서 부모로 로그인**해야
 *    했다 — 아이 앞에서 부모 비밀번호를 치는 흐름이다.
 *
 *    `consumeInvite` 는 이미 **어느 기기에서든** 되게 돼 있었다(`AC-002-3`).
 *    없던 것은 길이 아니라 **링크를 보여주는 화면**뿐이었다.
 *
 * 🔴 **주소창에 안 싣는다.** 리다이렉트로 돌려주면 토큰이 부모의 방문 기록에 남는다 —
 *    `D24` 가 지적한 그 모양이다. 값으로 돌려주고 화면이 보여준다.
 *
 * 🔴 **24시간 1회용이다.** 링크가 새도 한 번 쓰면 죽고, 하루면 스스로 만료된다 (`D33`).
 */
export async function createInviteLinkAction(): Promise<
  { ok: true; url: string; expiresAt: string } | { ok: false; reason: string }
> {
  const guardian = await requireGuardian();
  if (!guardian.consentCompleted) return { ok: false, reason: "CONSENT" };

  const child = await prisma.childAccount.findFirst({
    where: { guardianId: guardian.guardianId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!child) return { ok: false, reason: "NO_CHILD" };

  const { token, expiresAt } = await issueInvite(guardian.guardianId, child.id);

  // 🔴 배포 주소를 코드에 박지 않는다. 요청이 온 주소를 그대로 쓴다 —
  //    로컬·프리뷰·운영이 각자 자기 주소를 준다
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    ok: true,
    url: `${proto}://${host}/child/enter?t=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
  };
}
