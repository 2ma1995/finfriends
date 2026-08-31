import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import {
  child, consentCompleted, whatHappens, notCollected,
  confirmLabel, blockedLabel, parentExitNotice, nextHref,
} from "./join.fixture";

// CON-003 · CON-004 — 아이 기기에서 초대 링크를 열었을 때. 기기 등록이지 로그인이 아니다
export const metadata = { title: "기기 등록 · 핀프렌즈" };

export default function JoinPage() {
  return (
    <Screen
      role="부모 확인"
      title={`${child.displayName}의 기기가 맞나요?`}
      sub={`${child.birthYear}년생 · 부모가 눌러 주세요`}
      back={{ href: "/parent/invite", label: "자녀 초대" }}
    >
      <section>
        <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">등록하면 이렇게 됩니다</h2>
        <ul className="mt-1.5 grid gap-1">
          {whatHappens.map((line) => (
            <li key={line} className="rounded-card border border-line bg-surface px-3 py-2 text-[0.84em] leading-relaxed text-ink-soft">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-2.5">
        <Card>
          <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{notCollected.join(" · ")}</p>
        </Card>
      </div>

      {consentCompleted ? (
        <Link
          href={nextHref}
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary px-3 text-center text-[0.88em] font-bold text-white"
        >
          {confirmLabel}
        </Link>
      ) : (
        <button
          disabled
          className="mt-3 min-h-touch w-full cursor-not-allowed rounded-card bg-line-2 text-[0.88em] font-bold text-white"
        >
          {blockedLabel}
        </button>
      )}

      <p className="mt-2 text-center text-[0.76em] leading-relaxed text-ink-soft">{parentExitNotice}</p>
    </Screen>
  );
}
