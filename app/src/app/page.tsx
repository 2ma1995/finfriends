import Link from "next/link";

/**
 * 🔴 프로토타입 전용 색인. 본 개발에서 이 파일은 지운다.
 * 실제 서비스에는 「화면 목록」이 없다 — 동의 → 온보딩 → 각 홈으로 들어간다.
 */
export const metadata = { title: "화면 목록 · 핀프렌즈 프로토타입" };

const ROUTES = {
  clean: {
    label: "보호자 · Clean",
    desc: "증거 제시 · 판단 지원. 작은 글씨 · 각진 모서리 · 페이드만",
    items: [
      { href: "/login",             name: "로그인",       task: "CON-001" },
      { href: "/signup",            name: "계정 만들기",   task: "CON-001" },
      { href: "/consent",           name: "동의 게이트",   task: "CON-002" },
      { href: "/parent/onboarding", name: "시작하기 6단계", task: "CON-003" },
      { href: "/parent/invite",     name: "자녀 초대",     task: "CON-003" },
      { href: "/join",              name: "기기 등록",     task: "CON-004" },
      { href: "/parent/tree",       name: "성장 나무",     task: "GRW-003" },
      { href: "/parent/forest",     name: "월간 숲",       task: "GRW-005" },
      { href: "/parent/missions",   name: "승인 대기",     task: "PRC-001" },
      { href: "/parent/spending",   name: "소비 내역",     task: "PLN-005" },
    ],
  },
  fun: {
    label: "아이 · Fun",
    desc: "재미 · 즉각 보상. 큰 글씨 · 둥근 모서리 · 별이 튄다",
    items: [
      { href: "/child/home",           name: "내 방",        task: "UX-003" },
      { href: "/child/learn",          name: "배우기",       task: "LRN-001" },
      { href: "/child/quiz/spend",     name: "퀴즈",         task: "LRN-001" },
      { href: "/child/plan/new",       name: "계획 카드 적기", task: "PLN-001" },
      { href: "/child/retro/r-201",    name: "계획 ↔ 실제",  task: "PLN-003" },
      { href: "/child/wishlist",       name: "갖고 싶은 것",  task: "PRC-004" },
      { href: "/child/stars",          name: "내 별",        task: "STR-001" },
      { href: "/child/shop",           name: "별로 바꾸기",   task: "STR-005" },
    ],
  },
} as const;

export default function IndexPage() {
  return (
    <div data-mode="clean" className="mx-auto min-h-full max-w-[760px] bg-canvas px-5 py-8 text-ink">
      <h1 className="ff-serif text-[1.5rem] font-bold tracking-[-0.01em]">핀프렌즈 화면 프로토타입</h1>
      <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-soft">
        기능은 붙어 있지 않습니다. 화면·문구·두 모드의 차이만 확인하는 용도이며, 숫자는 전부 고정된 예시값입니다.
        <br />
        같은 토큰 이름이 모드마다 다른 값을 갖습니다 — 컴포넌트는 자기가 어느 모드인지 모릅니다.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {(["clean", "fun"] as const).map((mode) => (
          <section key={mode} data-mode={mode} className="rounded-card border border-line bg-canvas p-4">
            <h2 className="text-[0.95rem] font-bold">{ROUTES[mode].label}</h2>
            <p className="mt-1 text-[0.76rem] leading-relaxed text-ink-mute">{ROUTES[mode].desc}</p>
            <ul className="mt-3 grid gap-1.5">
              {ROUTES[mode].items.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex min-h-touch items-center justify-between gap-2 rounded-card border border-line bg-surface px-3 text-[0.86rem]">
                    <span>{r.name}</span>
                    <code className="shrink-0 text-[0.7rem] text-ink-mute">{r.task}</code>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 text-[0.74rem] leading-relaxed text-ink-mute">
        라우트 14건 · 명세 <code>docs/plan-docs/[Spec]Prototype-Visual-Plan.md</code> · 규칙 스킬 <code>401-prototype-visual-rules</code>
        <br />
        목 데이터는 화면 옆 <code>*.fixture.ts</code> 에 있고, 첫 줄 <code>{`PROTO-DATA`}:</code> 가 교체 대상 태스크를 가리킵니다.
      </p>
    </div>
  );
}
