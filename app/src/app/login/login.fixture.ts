// PROTO-DATA: CON-001 — 백엔드 완료 시 이 파일을 지우고 Supabase Auth 로그인 액션으로 대체한다

/**
 * 🔴 로그인하는 사람은 보호자 하나뿐이다 (스킬 304 §4 · CON-001 S5).
 *    아동용 로그인 입력을 이 화면에 두지 않는다 — 「아동 독립 로그인 시도 0건」은
 *    나중에 막는 방식으로 보증할 수 없고, 화면에 자리를 두는 순간 시도가 생긴다.
 *
 * 세션이 끝나면 아동 화면도 함께 잠긴다. 재로그인해도 **동의는 다시 확인한다** —
 * 동의를 캐시하지 않는 것이 규제 요건이다 (US-8 AC-E2 · 스킬 304 §2).
 */
export type Field = {
  readonly key: string;
  readonly label: string;
  readonly type: "email" | "password";
  readonly placeholder: string;
  readonly autoComplete: string;
};

export const fields: readonly Field[] = [
  {
    key: "email",
    label: "이메일",
    type: "email",
    placeholder: "parent@example.com",
    autoComplete: "email",
  },
  {
    key: "password",
    label: "비밀번호",
    type: "password",
    placeholder: "비밀번호",
    autoComplete: "current-password",
  },
];

export const submitLabel = "로그인";

/** 비밀번호 재설정 화면은 아직 없다 — CON-001 잔여 범위. 죽은 링크를 두지 않고 사실만 적는다 */
export const resetNotice = "비밀번호가 기억나지 않으면 가입한 이메일로 재설정 링크를 보내 드립니다.";

/** 스킬 304 §4 — 아동 화면은 보호자 세션에 매달려 있다. 부모가 알아야 하는 사실이다 */
export const sessionNotice = {
  title: "부모가 로그인해야 아이 화면이 열려요",
  body: "아이 화면은 부모 계정 안의 프로필로 열립니다. 로그인이 풀리면 아이 화면도 함께 잠기고, 다시 들어올 때 동의를 한 번 더 확인합니다.",
};

export const signupPrompt = {
  question: "아직 계정이 없나요?",
  label: "계정 만들기",
  href: "/signup",
};
