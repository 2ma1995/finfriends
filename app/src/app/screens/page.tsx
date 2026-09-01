import Link from "next/link";
import { redirect } from "next/navigation";
import { currentGuardian } from "@/lib/session/guardian-session";

/**
 * 화면 목록 — 🔴 **개발·시연용 색인이다.** 실제 동선이 아니다.
 *    실서비스는 동의 → 온보딩 → 각 홈으로 들어간다 (`/` 가 갈라 준다).
 *
 * 🔴 **한 번 지웠다가 되살렸다.** 지운 이유는 「프로토타입 잔재」였는데,
 *    화면이 서른 개를 넘으면서 **어디에 뭐가 있는지 한눈에 볼 곳**이 필요해졌다.
 *    프로토타입 색인이 아니라 **개발 색인**으로 성격이 바뀐 것이다.
 *
 * 🔴 **보호자 세션이 있어야 열린다.** 여기엔 `/parent/**` 링크가 있고,
 *    아이 기기에서 열리면 아이가 승인·결제 화면의 존재를 알게 된다 (`D5` · `S5`).
 *    미들웨어도 `/screens` 를 보호자 경로로 막지만 **여기서 한 번 더 본다** —
 *    쿠키는 힌트일 뿐이고 판정은 서버가 한다.
 */
export const metadata = { title: "화면 목록 · 핀프렌즈" };

type Item = { href: string; name: string; note: string; soon?: boolean };

const GROUPS: readonly { key: string; label: string; desc: string; items: readonly Item[] }[] = [
  {
    key: "clean",
    label: "보호자 · Clean",
    desc: "증거 제시 · 판단 지원. 작은 글씨 · 각진 모서리 · 페이드만",
    items: [
      { href: "/parent/onboarding",       name: "시작하기",        note: "6단계 · 다 끝내면 나무로 착지 (D43)" },
      { href: "/parent/child/new",        name: "아이 프로필",     note: "이름 · 태어난 해만" },
      { href: "/parent/invite",           name: "자녀 초대",       note: "24시간 1회용 코드 (D33)" },
      { href: "/parent/plan/new",         name: "첫 계획 카드",    note: "부모가 대신 한 장 (D43)" },
      { href: "/parent/card",             name: "카드 신청",       note: "발급은 범위 밖 · 신청만 (D20)" },
      { href: "/parent/tree",             name: "성장 나무",       note: "4영역 단계 · 실천 근거는 준비 중" },
      { href: "/parent/forest",           name: "월간 숲",         note: "전월 대비 변화" },
      { href: "/parent/bank",             name: "아이 통장",       note: "용돈 넣기 · 이자율 · 미션 · 적금" },
      { href: "/parent/bank/adjust",      name: "보낸 돈 수정",     note: "되돌리기 — 부모가 넣은 것만" },
      { href: "/parent/bank/history",     name: "용돈 기록",       note: "읽기만 — 아이가 한 것까지" },
      { href: "/parent/bank/missions",    name: "미션 승인",       note: "72시간 뒤 자동 만료 (D37)" },
      { href: "/parent/bank/missions/new", name: "미션 만들기",    note: "⭐ + 금액" },
      { href: "/parent/bank/savings",     name: "저금 승인",       note: "예금 · 적금 · 이자율" },
      { href: "/parent/spending",         name: "소비 내역",       note: "계획 ↔ 실제" },
      { href: "/parent/mypage",           name: "마이페이지",      note: "하교 시각 · PIN · 탈퇴" },
    ],
  },
  {
    key: "fun",
    label: "아이 · Fun",
    desc: "재미 · 즉각 보상. 큰 글씨 · 둥근 모서리 · 별이 튄다",
    items: [
      { href: "/child/welcome",       name: "처음이지?",       note: "첫 진입 튜토리얼 (D13)" },
      { href: "/child/home",          name: "내 방",           note: "아바타 · 옷장 · 별 · 하교 모달 (D41)" },
      { href: "/child/missions",      name: "미션",            note: "부모가 준 것 + 배워서 한 것 (D46)" },
      { href: "/child/learn",         name: "배우기",          note: "4영역 커리큘럼" },
      { href: "/child/learn/earn",    name: "배우기 · 벌기",   note: "이야기는 하루 한 편 (D47)" },
      { href: "/child/practice",      name: "실천하기",        note: "4칸 · 벌기·쓰기는 둠칫둠칫 (D44)" },
      { href: "/child/quiz/spend",    name: "퀴즈 · 잘 쓰기",  note: "분야별 하루 한 문제 (FR-011)" },
      { href: "/child/plan",          name: "쓸 계획",         note: "지난 카드 · 회고는 여기서" },
      { href: "/child/plan/new",      name: "계획 카드 적기",  note: "어디서 · 무엇을 · 얼마를" },
      { href: "/child/allowance",     name: "내 통장",         note: "내 돈 · 저금 · 들어오고 나간 돈" },
      { href: "/child/wishlist",      name: "갖고 싶은 것",    note: "모으기 실천" },
      { href: "/child/stars",         name: "내 별",           note: "별 원장" },
      { href: "/child/shop",          name: "상점",            note: "별로 방 꾸미기" },
      { href: "/child/locked",        name: "잠긴 화면",       note: "어른 자리 안내 (D42)" },
    ],
  },
  {
    key: "clean",
    label: "공통 · 진입",
    desc: "누구의 세션이냐로 갈린다 — 실제 서비스의 시작점",
    items: [
      { href: "/",         name: "루트",        note: "세션을 보고 갈라 보낸다" },
      { href: "/login",    name: "로그인",      note: "다 끝낸 사람은 나무로 (D43)" },
      { href: "/signup",   name: "계정 만들기", note: "보호자만" },
      { href: "/consent",  name: "동의 게이트", note: "아이 진입의 선행 조건" },
      { href: "/join",     name: "기기 등록",   note: "초대 코드를 받는 자리" },
      { href: "/unlock",   name: "아동 모드 해제", note: "보호자 PIN (D42)" },
    ],
  },
];

export default async function ScreensPage() {
  // 🔴 아이 기기에서 열리면 안 된다. 쿠키는 힌트이고 판정은 여기서 한다 (D5 · S5)
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");

  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <div data-mode="clean" className="mx-auto min-h-full max-w-[860px] bg-canvas px-5 py-8 text-ink">
      <h1 className="ff-serif text-[1.5rem] font-bold tracking-[-0.01em]">핀프렌즈 화면 목록</h1>
      <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-soft">
        {/* 🔴 예전 문구는 「기능이 안 붙어 있고 숫자는 고정된 예시값」이었다 — 지금은 **거짓이다.** */}
        <b>실제 데이터로 도는 화면입니다.</b> 목 데이터가 아니라 로그인한 계정의 실제 값을 읽습니다 —
        아이가 없거나 기기가 등록되지 않았으면 그 화면은 빈 상태로 나옵니다.
        <br />
        같은 토큰 이름이 모드마다 다른 값을 갖습니다. 컴포넌트는 자기가 어느 모드인지 모릅니다.
      </p>

      {/* 🔴 아이 화면은 **아이 기기에서만** 제대로 열린다. 헛걸음을 미리 막는다 */}
      <p className="mt-3 rounded-card border border-line-2 bg-surface px-3 py-2 text-[0.78rem] leading-relaxed text-ink-soft">
        아이 화면은 <b>기기 등록이 된 브라우저</b>에서만 열립니다. 지금 보호자 세션으로 누르면
        「아직 준비가 안 됐어요」가 나옵니다 — 고장이 아닙니다.
        <br />
        확인하려면 <code className="text-[0.94em]">/parent/invite</code> 에서 초대 코드를 내고 그 링크를 여세요.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.label} data-mode={g.key} className="rounded-card border border-line bg-canvas p-4">
            <h2 className="text-[0.95rem] font-bold">{g.label}</h2>
            <p className="mt-1 text-[0.76rem] leading-relaxed text-ink-mute">{g.desc}</p>
            <ul className="mt-3 grid gap-1.5">
              {g.items.map((r) => (
                <li key={r.href}>
                  <Link href={r.href}
                        className="block rounded-card border border-line bg-surface px-3 py-2">
                    <span className="flex items-baseline justify-between gap-2">
                      <b className="text-[0.86rem]">{r.name}</b>
                      <code className="shrink-0 text-[0.66rem] text-ink-mute">{r.href}</code>
                    </span>
                    <span className="mt-0.5 block text-[0.72rem] leading-snug text-ink-mute">{r.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 text-[0.74rem] leading-relaxed text-ink-mute">
        라우트 {total}건 · 어긋남 대장 <code>docs/ops-docs/[Ops]Spec-Drift-Log.md</code>
        <br />
        회고(<code>/child/retro/[recordId]</code>)와 학습 한 편(<code>/child/learn/[topic]/[lessonId]</code>)은
        id 가 있어야 열려서 목록에 두지 않았습니다 — 각각 <b>쓸 계획</b>과 <b>배우기 · 벌기</b>에서 들어갑니다.
      </p>
    </div>
  );
}
