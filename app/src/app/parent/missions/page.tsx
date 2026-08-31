import { Screen, Card, Empty } from "@/components/shared/Screen";
import { pendings, retroNotice, BULK_THRESHOLD } from "./mission.fixture";

// PRC-001 · PRC-003 — 승인 대기와 일괄 승인
export const metadata = { title: "승인 대기 · 핀프렌즈" };

export default function ParentMissionsPage() {
  return (
    <Screen role="부모 화면" title="승인 대기" sub={`${pendings.length}건`} back={{ href: "/parent/tree", label: "성장 나무" }}>
      {pendings.length === 0 ? (
        <Empty emoji="✅" title="기다리는 미션이 없어요" body="아이가 미션을 마치면 여기에 올라옵니다" />
      ) : (
        <>
          <Card tone="grow">
            <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{retroNotice.title}</h2>
            <p className="mt-1 text-[0.88em] leading-relaxed">{retroNotice.body}</p>
          </Card>

          <ul className="mt-2 grid gap-1.5">
            {pendings.map((p) => (
              <li key={p.id} className="rounded-card border border-line bg-surface p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[0.9em]">{p.title}</b>
                  <span className="shrink-0 text-[0.72em] text-ink-mute">{p.doneAt}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="rounded-full bg-primary-bg px-2 py-0.5 text-[0.7em] text-primary-d">{p.topic}</span>
                  <span className="text-[0.78em] text-star-d">⭐ {p.reward}</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button className="min-h-touch flex-1 rounded-card bg-primary text-[0.84em] font-bold text-white">승인</button>
                  <button className="min-h-touch rounded-card border border-line-2 px-3 text-[0.84em] text-ink-soft">보류</button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-[0.72em] text-ink-mute">
            {pendings.length >= BULK_THRESHOLD
              ? "5건 이상이라 일괄 승인을 쓸 수 있습니다"
              : `${BULK_THRESHOLD}건부터 일괄 승인이 열립니다 · 지금 ${pendings.length}건`}
          </p>
        </>
      )}
    </Screen>
  );
}
