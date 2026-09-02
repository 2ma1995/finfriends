import type { ReactNode } from "react";
import Link from "next/link";

/**
 * 화면 머리 — 모든 라우트가 같은 순서로 연다. 제목 → 부제.
 *
 * 🔴 **「아이 화면」·「부모 화면」 라벨을 지웠다** (사용자 요청).
 *    프로토타입 때 **두 모드를 나란히 보여주려고** 붙인 것이다. 실제 제품에서
 *    아이는 자기가 아이 화면을 본다는 것을 알고, 부모도 마찬가지다 —
 *    **아무도 안 읽는 글자가 모든 화면 맨 위 한 줄**을 차지하고 있었다.
 */
export function Screen({
  title, sub, back, children,
}: { title: string; sub?: string; back?: { href: string; label: string }; children: ReactNode }) {
  return (
    <main className="px-gap pb-10 pt-4">
      {/* 🔴 돌아갈 길만 남는다. 없으면 줄 자체를 안 그린다 — 빈 줄이 여백처럼 남으면 안 된다 */}
      {back ? (
        <div className="flex items-baseline justify-end">
          <Link href={back.href} className="text-cap text-ink-mute underline underline-offset-2">
            {back.label}
          </Link>
        </div>
      ) : null}
      <h1 className={`ff-serif text-title font-bold tracking-[-0.01em] ${back ? "mt-1" : ""}`}>{title}</h1>
      {sub ? <p className="mb-3 mt-0.5 text-sub text-ink-mute">{sub}</p> : <div className="mb-3" />}
      {children}
    </main>
  );
}

/** 빈 상태 — 흰 화면을 만들지 않는다. 안내 + 다음 행동 (ACE-1.1) */
export function Empty({ emoji, title, body, hint }: {
  emoji: string; title: string; body: string; hint?: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-2 bg-sand px-4 py-6 text-center">
      <div className="text-[1.6em]">{emoji}</div>
      <p className="mt-2 text-body leading-relaxed text-ink-soft">
        <b className="text-ink">{title}</b><br />{body}
      </p>
      {hint ? <small className="mt-2 block text-sub text-ink-mute">{hint}</small> : null}
    </div>
  );
}

/** 카드 — 두 모드가 radius 만 다르다 */
/**
 * 카드 — 🔴 **선은 「무슨 일이 있다」를 말할 때만 그린다.**
 *
 * 예전엔 `surface` 도 `border-line` 을 둘렀다. 화면의 **모든 상자**가 선을 갖게 되니
 * 정작 `miss`(문제)·`grow`(좋은 소식)의 선이 **눈에 안 들어왔다** —
 * 다 두르면 아무것도 안 두른 것과 같다.
 *
 * 🔴 기본은 **배경만**이다. 묶는 것은 배경과 여백이고, 선은 뜻을 갖는다.
 */
export function Card({ children, tone = "surface" }: { children: ReactNode; tone?: "surface" | "miss" | "grow" }) {
  const cls = {
    surface: "bg-surface",
    miss: "border border-miss-line bg-miss-bg",
    grow: "border border-primary-l/50 bg-primary-bg",
  }[tone];
  return <section className={`rounded-card p-3.5 ${cls}`}>{children}</section>;
}
