import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getTopicProgress } from "@/modules/learning";
import { consentRequired, continueLabel, doneLabel, lockedLabel, noDevice, notice,
         progressLabel, startLabel } from "./learn.fixture";

// LRN-001 — 커리큘럼 4영역. 🔴 진도는 DB 를 본다
export const metadata = { title: "배우기 · 핀프렌즈" };

export default async function ChildLearnPage() {
  const access = await currentChild();
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="배우기">
        <Empty emoji="📚" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  const topics = await getTopicProgress(access.childId);

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
                  {t.locked ? lockedLabel : progressLabel(t.completed, t.total, t.quizCorrect)}
                </span>
              </span>
              {!t.locked ? (
                <span className="text-[0.8em] text-primary-d">
                  {t.completed >= t.total ? doneLabel : t.completed > 0 ? continueLabel : startLabel}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={t.topic}>
              {t.locked ? (
                <div className="flex min-h-touch items-center gap-2 rounded-card border border-dashed border-line-2 px-3 opacity-60">{body}</div>
              ) : (
                <Link href={`/child/learn/${t.topic.toLowerCase()}`}
                      className="flex min-h-touch items-center gap-2 rounded-card border border-line bg-surface px-3">{body}</Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3"><Card tone="grow"><p className="text-[0.86em] leading-relaxed">{notice}</p></Card></div>
    </Screen>
  );
}
