"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GUARDIAN_COOKIE, createGuardian, signIn, closeSession, type AuthResult,
} from "@/lib/session/guardian-session";

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
  WEAK_PASSWORD: "비밀번호는 8자 이상이고 숫자를 하나 이상 넣어 주세요.",
  INVALID_EMAIL: "이메일 형식을 확인해 주세요.",
};

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
  // 가입 다음은 동의다. 동의 전에는 아이 정보를 받지 않는다 (P-05 · P-22)
  redirect("/consent");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await signIn(email, password);
  if (!result.ok) backTo("/login", result.reason, email);

  await setSessionCookie(result.token, result.expiresAt);
  redirect("/parent/onboarding");
}

export async function signOutAction() {
  const jar = await cookies();
  await closeSession(jar.get(GUARDIAN_COOKIE)?.value);
  jar.delete(GUARDIAN_COOKIE);
  redirect("/login");
}
