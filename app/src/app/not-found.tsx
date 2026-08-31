import Link from "next/link";

// 빈 화면을 만들지 않는다 — 안내 + 다음 행동 (ACE-1.1 · 스킬 401)
export default function NotFound() {
  return (
    <div data-mode="clean" className="mx-auto min-h-full max-w-frame bg-canvas px-gap py-10 text-ink">
      <p className="text-[2rem]">🌱</p>
      <h1 className="mt-2 text-title font-bold">아직 없는 화면이에요</h1>
      <p className="mt-2 text-body text-ink-soft">주소를 다시 확인해 주세요.</p>
      <Link href="/" className="mt-5 inline-block rounded-card bg-primary px-4 py-2.5 font-bold text-white">
        화면 목록으로
      </Link>
    </div>
  );
}
