import Link from "next/link";
import { Screen, Card } from "@/components/shared/Screen";
import { getQuiz, TOPICS } from "./quiz.fixture";

// LRN-001 — 퀴즈. 오답에 벌칙·감소 연출을 두지 않는다
export const metadata = { title: "퀴즈 · 핀프렌즈" };
export function generateStaticParams() { return TOPICS.map((topic) => ({ topic })); }

export default async function ChildQuizPage({ params }: { params: Promise<{ topic: string }> }) {
  const q = getQuiz((await params).topic);

  return (
    <Screen role="아이 화면" title={`${q.topicLabel} 퀴즈`} sub={`${q.index} / ${q.total}문제`} back={{ href: "/child/learn", label: "배우기" }}>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary-l" style={{ width: `${(q.index / q.total) * 100}%` }} />
      </div>

      <Card>
        <p className="text-[1em] font-bold leading-relaxed">{q.question}</p>
      </Card>

      <ul className="mt-2 grid gap-1.5">
        {q.choices.map((c) => (
          <li key={c.key}>
            <button className="flex min-h-touch w-full items-center gap-2 rounded-card border border-line bg-surface px-3 text-left text-[0.9em]">
              <span className="text-ink-mute">{c.key.toUpperCase()}</span>{c.text}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <Card tone="grow">
          <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">왜 그럴까요</h2>
          <p className="mt-1 text-[0.88em] leading-relaxed">{q.explain}</p>
        </Card>
      </div>

      <Link href="/child/learn" className="mt-2 block min-h-touch rounded-card bg-primary text-center text-[0.9em] font-bold leading-[44px] text-white">
        다음 문제
      </Link>
    </Screen>
  );
}
