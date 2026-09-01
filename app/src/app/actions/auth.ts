"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { guardianLanding } from "@/lib/session/landing";
import {
  GUARDIAN_COOKIE, createGuardian, signIn, closeSession, type AuthResult,
} from "@/lib/session/guardian-session";
import { DEVICE_COOKIE } from "@/lib/session/device-session";
import { MODE_COOKIE } from "@/lib/session/device-mode";

/**
 * 보호자 인증 — CON-001.
 *
 * 🔴 **§6.1 서버 진입점 표에 없는 진입점이다.** 어긋남 대장 D9 참조.
 *    표가 인증을 안 적은 이유는 Supabase Auth 가 자기 엔드포인트로 처리하기 때문인데,
 *    지금은 로컬 Postgres 로 만들고 있어서 우리 쪽에 액션이 필요하다.
 *    Supabase 이관 때 이 파일은 사라지고 표가 다시 맞는다.
 *
 * 실패를 예외로 던지지 않고 **쿼리 문자열로 돌려보낸다** — 화면이 RSC 라 상태를 들고 있지 않다.
 * 입력값은 다시 채워 준다. 재입력 0건이 US-8 AC1 의 요구다.
 */

/** 사용자에게 보이는 문구. 어느 쪽이 틀렸는지 알려주지 않는다 — 계정 존재 여부가 새면 안 된다 */
const MESSAGES: Record<Exclude<AuthResult, { ok: true }>["reason"], string> = {
  EMAIL_TAKEN: "이미 가입된 이메일이에요. 로그인해 주세요.",
  BAD_CREDENTIALS: "이메일이나 비밀번호가 맞지 않아요.",
  /**
   * 🔴 **계정이 있는지 알려주지 않는다.** 「그 계정이 잠겼다」로 적으면
   *    공격자가 이메일 존재를 확인하는 수단이 된다 (어긋남 대장 D54).
   *    잠긴 시간도 말하지 않는다 — 언제 다시 되는지 알면 그때 다시 돌린다.
   */
  LOCKED: "너무 여러 번 시도했어요. 잠시 뒤에 다시 해 주세요.",
  WEAK_PASSWORD: "비밀번호는 8자 이상이고 숫자를 하나 이상 넣어 주세요.",
  INVALID_EMAIL: "이메일 형식을 확인해 주세요.",
};

/**
 * 🔴 **보호자로 들어오면 아동 모드를 끈다.**
 *
 * 안 껐더니 이런 일이 났다 — `test@naver.com` 으로 로그인했는데 화면에 **다른 집 아이**가
 * 나왔다. 그 브라우저에 시드가 만든 아이(`dev-guardian` 의 「서연」)의 기기 토큰이
 * 남아 있었고, 아이 화면은 **로그인한 보호자가 아니라 기기 토큰**을 보기 때문이다.
 * 게다가 `/parent/**` 는 미들웨어가 전부 `/child/locked` 로 돌려보내서
 * **자기 화면에 들어갈 수가 없었다.**
 *
 * 🔴 아동 모드를 푸는 정식 열쇠는 PIN 이다(`D5`). **그 화면이 아직 없다.**
 *    그래서 한 번 아이 모드가 된 브라우저는 쿠키를 손으로 지우는 것 말고는
 *    빠져나올 방법이 없었다. 비밀번호는 4자리 PIN 보다 강한 증명이므로
 *    그때까지 로그인이 그 역할을 겸한다 (어긋남 대장 D27).
 *
 * 아이가 다시 쓰려면 초대 링크를 한 번 더 열면 된다 — 지금은 `/child/enter` 한 번이다.
 */
async function clearChildMode() {
  const jar = await cookies();
  jar.delete(MODE_COOKIE);
  jar.delete(DEVICE_COOKIE);
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(GUARDIAN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

function backTo(path: string, reason: string, email: string): never {
  const q = new URLSearchParams({ error: MESSAGES[reason as keyof typeof MESSAGES], email });
  redirect(`${path}?${q}`);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("passwordConfirm") ?? "");

  if (password !== confirm) {
    const q = new URLSearchParams({ error: "비밀번호 두 개가 서로 달라요.", email });
    redirect(`/signup?${q}`);
  }

  const result = await createGuardian(email, password);
  if (!result.ok) backTo("/signup", result.reason, email);

  await setSessionCookie(result.token, result.expiresAt);
  await clearChildMode();
  // 가입 다음은 동의다. 동의 전에는 아이 정보를 받지 않는다 (P-05 · P-22)
  redirect("/consent");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await signIn(email, password);
  if (!result.ok) backTo("/login", result.reason, email);

  await setSessionCookie(result.token, result.expiresAt);
  await clearChildMode();
  // 🔴 다 끝낸 사람은 나무로 간다 — 할 일 목록은 할 일이 남은 사람의 것이다 (D43)
  redirect(await guardianLanding(result.guardianId));
}

export async function signOutAction() {
  const jar = await cookies();
  await closeSession(jar.get(GUARDIAN_COOKIE)?.value);
  jar.delete(GUARDIAN_COOKIE);
  // 🔴 나갈 때도 끈다. 안 끄면 로그아웃하자마자 남의 아이 화면으로 떨어진다
  await clearChildMode();
  redirect("/login");
}
