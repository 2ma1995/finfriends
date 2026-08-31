import { Screen, Card } from "@/components/shared/Screen";
import { items, notCollected, gateNotice } from "./consent.fixture";

// CON-002 — 법정대리인 동의 게이트
export const metadata = { title: "동의 · 핀프렌즈" };

export default function ConsentPage() {
  const blocked = items.some((i) => i.required && !i.checked);

  return (
    <Screen role="보호자 확인" title="시작하기 전에" sub="만 14세 미만 아동" back={{ href: "/", label: "화면 목록" }}>
      <ul className="grid gap-1.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-start gap-2 rounded-card border border-line bg-surface p-3">
            <span className={`mt-0.5 text-[0.9em] ${i.checked ? "text-primary" : "text-ink-mute"}`}>{i.checked ? "☑" : "☐"}</span>
            <span className="flex-1 text-[0.84em] leading-relaxed">
              {i.label}
              {i.required ? <b className="ml-1 text-[0.82em] text-miss">필수</b> : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2">
        <Card>
          <h2 className="text-[0.76em] tracking-[0.03em] text-ink-mute">받지 않는 것</h2>
          <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{notCollected.join(" · ")}</p>
        </Card>
      </div>

      <button disabled={blocked}
              className="mt-3 min-h-touch w-full rounded-card text-[0.9em] font-bold text-white disabled:cursor-not-allowed"
              style={{ background: blocked ? "var(--ff-ink-mute)" : "var(--ff-primary)" }}>
        {blocked ? "필수 항목이 남았어요" : "동의하고 시작하기"}
      </button>
      <p className="mt-2 text-center text-[0.74em] text-ink-mute">{gateNotice}</p>
    </Screen>
  );
}
