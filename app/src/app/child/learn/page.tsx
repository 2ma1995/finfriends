import Link from "next/link";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentChild } from "@/lib/session/current-child";
import { getTopicProgress } from "@/modules/learning";
import { consentRequired, continueLabel, doneLabel, noDevice, notice,
         practiceSoonLabel, progressLabel, startLabel } from "./learn.fixture";

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
                <b className="block text-body">{t.label}</b>
                <span className="text-cap text-ink-mute">
                  {progressLabel(t.completed, t.total, t.quizCorrect)}
                  {!t.practiceOpen ? ` · ${practiceSoonLabel}` : ""}
                </span>
              </span>
              <span className="text-sub text-primary-d">
                {t.completed >= t.total ? doneLabel : t.completed > 0 ? continueLabel : startLabel}
              </span>
            </>
          );
          return (
            <li key={t.topic}>
              <Link href={`/child/learn/${t.topic.toLowerCase()}`}
                    className="flex min-h-touch items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">{body}</Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-3"><Card tone="grow"><p className="text-sub leading-relaxed">{notice}</p></Card></div>
    </Screen>
  );
}
