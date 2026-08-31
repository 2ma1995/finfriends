import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { topics, notice } from "./learn.fixture";

// LRN-001 — 커리큘럼 4영역
export const metadata = { title: "배우기 · 핀프렌즈" };

export default function ChildLearnPage() {
  return (
    <Screen role="아이 화면" title="배우기" back={{ href: "/child/home", label: "내 방" }}>
      <ul className="grid gap-1.5">
        {topics.map((t) => {
          const body = (
            <>
              <span className="text-[1.4em]">{t.icon}</span>
              <span className="flex-1">
                <b className="block text-[0.9em]">{t.label}</b>
                <span className="text-[0.74em] text-ink-mute">
                  {t.locked ? "곧 열려요" : `${t.done} / ${t.total}편`}
                </span>
              </span>
              {!t.locked ? <span className="text-[0.8em] text-primary-d">{t.done === t.total ? "다 봤어요" : "이어보기"}</span> : null}
            </>
          );
          return (
            <li key={t.key}>
              {t.locked ? (
                <div className="flex min-h-touch items-center gap-2 rounded-card border border-dashed border-line-2 px-3 opacity-60">{body}</div>
              ) : (
                <Link href={`/child/quiz/${t.key}`} className="flex min-h-touch items-center gap-2 rounded-card border border-line bg-surface px-3">{body}</Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <Card tone="grow">
          <p className="text-[0.86em] leading-relaxed">{notice}</p>
        </Card>
      </div>
    </Screen>
  );
}
