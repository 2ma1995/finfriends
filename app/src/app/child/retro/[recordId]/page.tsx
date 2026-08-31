import Link from "next/link";
import { Screen } from "@/components/shared/Screen";
import { getRetro, RECORD_IDS, type Line } from "./retro.fixture";

// PLN-003 · PLN-004 — 두 갈래 회고
export const metadata = { title: "계획 ↔ 실제 · 핀프렌즈" };
export function generateStaticParams() { return RECORD_IDS.map((recordId) => ({ recordId })); }
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

function Column({ head, lines, alert }: { head: string; lines: readonly Line[]; alert: boolean }) {
  const sum = lines.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <h2 className="mb-1.5 text-[0.72em] tracking-[0.04em] text-ink-mute">{head}</h2>
      {lines.map((l) => (
        <div key={l.label} className={`flex justify-between py-0.5 text-[0.82em] ${l.unplanned ? "font-bold text-miss" : ""}`}>
          <span>{l.icon} {l.label}</span><span className="tabular-nums">{won(l.amount)}</span>
        </div>
      ))}
      <div className={`mt-1.5 flex justify-between border-t border-line pt-1.5 text-[0.86em] font-bold ${alert ? "text-miss" : ""}`}>
        <span>합계</span><span className="tabular-nums">{won(sum)}</span>
      </div>
    </div>
  );
}

export default async function ChildRetroPage({ params }: { params: Promise<{ recordId: string }> }) {
  const r = getRetro((await params).recordId);
  const met = r.match === "MET";

  return (
    <Screen role="아이 화면" title="계획 ↔ 실제" sub={r.whenLabel} back={{ href: "/child/home", label: "내 방" }}>
      <div className="grid grid-cols-2 gap-2">
        <Column head="적어둔 것" lines={r.planned} alert={false} />
        <Column head="실제로 쓴 것" lines={r.actual} alert={!met} />
      </div>

      {/* 회고 문장 — 넘김에도 똑같이 나온다. 색은 테라코타이고 경고색이 아니다 */}
      <div className={`mt-2 rounded-card border p-3 ${met ? "border-primary-l/50 bg-primary-bg" : "border-miss-line bg-miss-bg"}`}>
        <p className="ff-serif text-[1em] leading-relaxed">
          {r.retroLines.map((l) => <span key={l} className="block">{l}</span>)}
        </p>
        <div className={`mt-2 text-[0.82em] font-bold ${met ? "text-primary-d" : "text-miss"}`}>{r.starLabel}</div>
      </div>

      {/* 아이가 하는 유일한 조작 — 이유를 고르게 하지 않는다 */}
      <button className="mt-2 min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white">확인했어요</button>

      <p className="mt-2 text-center text-[0.74em] text-ink-mute">
        다른 갈래 보기 —{" "}
        <Link href={met ? "/child/retro/r-202" : "/child/retro/r-201"} className="underline underline-offset-2">
          {met ? "계획 넘김" : "계획 지킴"}
        </Link>
      </p>
    </Screen>
  );
}
