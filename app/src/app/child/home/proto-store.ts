"use client";

// PROTO-DATA: STR-001 · STR-003 · STR-005 — 백엔드 완료 시 이 파일을 지우고 서버 상태로 대체한다

/**
 * 🔴 프로토타입 전용 지갑·보유·착용 상태.
 *
 * 서버가 없으니 브라우저에 남긴다. 카탈로그(`room.fixture.ts`)가 기본값이고
 * 이 저장소가 그 위에 덮인다. 본 개발에서는 셋 다 서버가 갖는다.
 */
import { useEffect, useState } from "react";
import { CATALOG, DEFAULT_CHARACTER, type Item } from "./room.fixture";

const KEY = "ff-proto-wallet";

export type Wallet = {
  stars: number;
  owned: string[];
  character: string;
  wear: string[];
};

export const DEFAULT_WALLET: Wallet = {
  stars: 40,
  owned: CATALOG.filter((i) => i.owned).map((i) => i.id),
  character: DEFAULT_CHARACTER,
  wear: ["cap", "bag"],
};

export function readWallet(): Wallet {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_WALLET, ...(JSON.parse(raw) as Partial<Wallet>) } : DEFAULT_WALLET;
  } catch {
    return DEFAULT_WALLET;   // 사생활 보호 모드 등 — 기본값으로 돈다
  }
}

export function writeWallet(w: Wallet) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* 무시 */ }
  // 같은 탭의 다른 컴포넌트에도 알린다 — storage 이벤트는 다른 탭에만 간다
  window.dispatchEvent(new CustomEvent("ff-wallet", { detail: w }));
}

export function resetWallet() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
  window.dispatchEvent(new CustomEvent("ff-wallet", { detail: DEFAULT_WALLET }));
}

/** 산다 — 별을 깎고 보유에 넣는다. 착용/캐릭터는 바로 적용한다 */
export function buy(w: Wallet, item: Item): Wallet {
  if (w.owned.includes(item.id) || w.stars < item.cost) return w;
  const next: Wallet = { ...w, stars: w.stars - item.cost, owned: [...w.owned, item.id] };
  if (item.placement.kind === "avatar") next.character = item.id;
  if (item.placement.kind === "socket") next.wear = [...next.wear, item.id];
  return next;
}

export function ownedItems(w: Wallet) {
  return CATALOG.filter((i) => w.owned.includes(i.id));
}

/**
 * 지갑을 읽어 두고 **바뀔 때마다 다시 읽는다.**
 *
 * 마운트 때 한 번만 읽으면 상점에서 바꾼 것이 방에 안 보인다 —
 * Next 라우터가 이전 화면을 캐시해서 되돌아올 때 마운트 효과가 다시 돌지 않는다.
 * 그래서 **화면이 다시 보이는 순간**(focus · visibility · pageshow)마다 읽는다.
 */
export function useWallet() {
  const [w, setW] = useState<Wallet | null>(null);

  useEffect(() => {
    const sync = () => setW(readWallet());
    sync();

    const onDetail = (e: Event) => setW((e as CustomEvent<Wallet>).detail);
    window.addEventListener("ff-wallet", onDetail);   // 같은 화면 안에서 바꿨을 때
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);        // 뒤로 가기 복원
    window.addEventListener("storage", sync);         // 다른 탭
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.removeEventListener("ff-wallet", onDetail);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return w;
}
