import { Card } from "@/components/shared/Screen";

/**
 * 정체 안내 — 아이 탓으로 읽히면 안 된다 (AC-3.2 오귀인 ≤ 2/8).
 * 정체는 조건의 문제로 쓴다. 문구는 화면 옆 fixture 가 갖는다.
 */
export function InactivityBanner({ title, lines, days }: { title: string; lines: readonly string[]; days: number }) {
  return (
    <Card tone="grow">
      <h2 className="text-cap tracking-[0.03em] text-primary-d">{title}</h2>
      <p className="mt-1 text-body leading-relaxed">
        {lines.map((l) => <span key={l} className="block">{l}</span>)}
      </p>
      <small className="mt-1 block text-cap text-ink-mute">{days}일째 같은 단계</small>
    </Card>
  );
}
