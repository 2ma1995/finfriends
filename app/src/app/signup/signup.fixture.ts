// PROTO-DATA: CON-001 — 백엔드 완료 시 이 파일을 지우고 Supabase Auth 가입 액션으로 대체한다

/**
 * 🔴 계정을 만드는 사람은 보호자 하나뿐이다 (스킬 304 §4 · CON-001 S5).
 *    아동 프로필은 이 계정 하위 레코드로만 존재하며 자체 자격증명을 갖지 않는다.
 *
 * 이메일·비밀번호는 Supabase Auth 가 보관한다 — `guardian_accounts` 는 `auth_ref` 만 갖는다.
 * 이 화면에서 아이 정보를 받지 않는다. 동의(2단계) 전에는 아동 개인정보 처리가 시작될 수 없다(P-05 · P-22).
 */
export type Field = {
  readonly key: string;
  readonly label: string;
  readonly type: "email" | "password";
  readonly placeholder: string;
  readonly hint?: string;
};

export const fields: readonly Field[] = [
  {
    key: "email",
    label: "이메일",
    type: "email",
    placeholder: "parent@example.com",
    hint: "로그인에 쓰고, 승인 요청 알림도 여기로 갑니다",
  },
  {
    key: "password",
    label: "비밀번호",
    type: "password",
    placeholder: "8자 이상",
    hint: "8자 이상 · 숫자 하나 이상",
  },
  {
    key: "passwordConfirm",
    label: "비밀번호 확인",
    type: "password",
    placeholder: "한 번 더 적어 주세요",
  },
];

/** US-8 AC1 — 중간에 그만두고 다음날 다시 열어도 재입력이 0건이어야 한다 */
export const resumeNotice = "여기까지 적으면 저장됩니다. 다음에 열면 이 다음 단계부터 시작해요.";

/** 스킬 304 §4 — 「아동 독립 로그인 시도 0건」은 인증 구조에서 결정된다. 나중에 막을 수 없다 */
export const childAccountNotice = {
  title: "아이는 따로 로그인하지 않아요",
  body: "아이 화면은 부모 계정 안의 프로필로 열립니다. 아이가 쓸 아이디와 비밀번호는 만들지 않습니다.",
};

/** 남은 단계. 5단계 본인 확인 방식은 🔴 D-03 미결이다(ADR-T09) — 확정 사양처럼 쓰지 않는다 */
export type NextStep = {
  readonly n: number;
  readonly title: string;
  readonly body: string;
  readonly undecided?: boolean;
};

export const nextSteps: readonly NextStep[] = [
  { n: 2, title: "법정대리인 동의", body: "동의를 마쳐야 아이 화면이 열립니다" },
  { n: 3, title: "아이 프로필", body: "이름과 태어난 해를 적습니다 — 생년월일 전체는 받지 않습니다" },
  { n: 4, title: "자녀 초대", body: "아이 기기를 등록합니다" },
  { n: 5, title: "첫 계획 카드", body: "어디서 얼마를 쓸지 한 장만 적어 봅니다" },
  { n: 6, title: "카드 연결", body: "본인 확인은 카드 발급과 함께 진행합니다", undecided: true },
];

export const nextLabel = "다음 — 동의 확인하기";

export const loginPrompt = {
  question: "이미 계정이 있나요?",
  label: "로그인",
  href: "/login",
};
