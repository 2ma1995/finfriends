import type { Stage } from "@/contracts/growth";

/**
 * 나무 그림 — 단계별 정적 표현.
 * 🔴 Lottie 를 설치하지 않는다. 로컬 최소안 §2 「L5에서 Lottie는 정적 이미지로 대체」.
 *
 * 🔴 **4단계다** (`FR-030` · 어긋남 대장 D30). 크기가 단계마다 커지는 것이
 *    「자랐다」를 말하는 유일한 시각 신호다 — 이모지만 바뀌면 눈에 안 띈다.
 *    단계 타입을 계약에서 가져오므로 단계가 늘면 여기서 컴파일이 깨진다. 그게 맞다.
 */
const SIZE: Record<Stage, number> = { 0: 24, 1: 30, 2: 36, 3: 42 };

export function TreeArt({ stage, icon }: { stage: Stage; icon: string }) {
  return (
    <div className="flex h-11 items-end justify-center" aria-hidden>
      <span style={{ fontSize: SIZE[stage], lineHeight: 1 }}>{icon}</span>
    </div>
  );
}
