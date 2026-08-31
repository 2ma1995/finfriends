export default function Loading() {
  return (
    <div className="animate-pulse px-gap py-6">
      <div className="h-5 w-32 rounded bg-line" />
      <div className="mt-3 h-16 rounded-card bg-line/60" />
      <div className="mt-2 h-20 rounded-card bg-line/60" />
      <div className="mt-3 grid gap-1.5">{[0,1,2,3,4].map((i) => <div key={i} className="h-9 rounded-card bg-line/60" />)}</div>
    </div>
  );
}
