import { redirect } from "next/navigation";
import { prisma } from "@/db";
import { currentChild } from "@/lib/session/current-child";
import { currentGuardian } from "@/lib/session/guardian-session";

/**
 * 진입점 — 누가 들고 있는 세션이냐로 갈린다.
 *
 * 🔴 **순서가 중요하다.** 기기 세션을 먼저 본다.
 *    아이 기기에는 보호자 세션이 남아 있을 수 있고, 그 경우 보호자 화면으로 보내면
 *    아이가 승인·소비 화면에 도달한다 (D5 · PRC-001 붕괴).
 *
 * 🔴 **처음 온 사람은 여기까지 안 온다.** 세션 쿠키가 하나도 없으면 미들웨어가
 *    `/landing.html` 로 rewrite 한다 — 제품이 무엇인지 보기 전에 로그인 화면을
 *    들이밀지 않는다. 여기 오는 사람은 **이미 쿠키를 가진 사람**이다.
 *
 * 화면 목록(`/screens`)은 **개발·시연용 색인**이며 실제 서비스 동선이 아니다.
 * 보호자 세션이 있어야 열리고, 아동 모드에서는 미들웨어가 막는다 (D5 · S5).
 */
export default async function RootPage() {
  // ① 아이 기기 — 토큰과 동의를 매 진입마다 확인한다 (ACE-8.2)
  const child = await currentChild();
  if (child.ok) redirect("/child/home");
  if (child.reason === "CONSENT_REQUIRED") redirect("/consent");

  /**
   * ② 보호자
   *
   * 🔴 **로그인이 아니라 `/leave` 로 보낸다** (사용자 요청 · 어긋남 대장 D72).
   *
   *    여기까지 왔다는 것은 **쿠키는 있는데 세션이 죽었다**는 뜻이다 —
   *    쿠키가 없으면 미들웨어가 이미 랜딩으로 보냈다.
   *
   *    예전엔 `/login` 으로 보냈다. 그러면 로그인 화면의 「처음으로」가 `/` 로 오고,
   *    쿠키가 그대로라 다시 여기로 와서 **또 로그인으로 튕겼다** — 원이었다.
   *
   *    `/leave` 가 죽은 쿠키를 털고 `/` 로 돌려보내면, 그때는 미들웨어가
   *    랜딩을 준다. **나가는 길이 실제로 나간다.**
   */
  const guardian = await currentGuardian();
  if (!guardian) redirect("/leave");
  if (!guardian.consentCompleted) redirect("/consent");

  // ③ 온보딩을 끝냈는가 — 아이가 없으면 볼 나무도 없다
  const children = await prisma.childAccount.count({
    where: { guardianId: guardian.guardianId },
  });
  redirect(children > 0 ? "/parent/tree" : "/parent/onboarding");
}
