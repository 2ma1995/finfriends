/**
 * 나무 그림 — 단계별 정적 표현.
 * 🔴 Lottie 를 설치하지 않는다. 로컬 최소안 §2 「L5에서 Lottie는 정적 이미지로 대체」.
 * 🔴 단계 수 3종은 D6 미결이라 예시값이다 (원장 T9).
 */
export function TreeArt({ stage, icon }: { stage: 0 | 1 | 2; icon: string }) {
  const size = [26, 32, 38][stage];
  return (
    <div className="flex h-10 items-end justify-center" aria-hidden>
      <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>
    </div>
  );
}
