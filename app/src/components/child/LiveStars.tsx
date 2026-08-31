"use client";

import { StarHUD } from "./StarHUD";
import { useWallet } from "@/app/child/home/proto-store";

/** 🔴 프로토타입 전용 — 별 잔액을 저장소에서 읽어 실시간으로 보여준다 */
export function LiveStars() {
  const w = useWallet();
  return <StarHUD balance={w?.stars ?? 0} />;
}
