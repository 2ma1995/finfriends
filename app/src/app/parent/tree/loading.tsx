// 스켈레톤 — 화면이 비어 보이는 순간에도 자리를 잡아 둔다
export default function Loading() {
  return (
    <div className="animate-pulse px-gap py-6">
      <div className="h-5 w-28 rounded bg-line" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-card bg-line/60" />)}
      </div>
      <div className="mt-3 h-20 rounded-card bg-line/60" />
    </div>
  );
}
