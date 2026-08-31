"use client";

import Image from "next/image";
import { useWallet, writeWallet, resetWallet, buy } from "../home/proto-store";
import type { Item } from "../home/room.fixture";

/**
 * 상점 격자 — 🔴 프로토타입 전용.
 * 별 잔액·보유·착용을 브라우저에 들고 있다. 본 개발에서는 서버 액션이 대신한다(STR-005).
 */
export function ShopGrid({ items }: { items: readonly Item[] }) {
  const w = useWallet();

  if (!w) {
    return <ul className="mt-2 grid grid-cols-2 gap-2">
      {items.map((i) => <li key={i.id} className="h-[190px] animate-pulse rounded-card bg-sand" />)}
    </ul>;
  }

  const equipped = (i: Item) =>
    i.placement.kind === "avatar" ? w.character === i.id
    : i.placement.kind === "socket" ? w.wear.includes(i.id)
    : true;

  const toggle = (i: Item) => {
    if (i.placement.kind === "avatar") return writeWallet({ ...w, character: i.id });
    if (i.placement.kind === "socket") {
      const on = w.wear.includes(i.id);
      return writeWallet({ ...w, wear: on ? w.wear.filter((x) => x !== i.id) : [...w.wear, i.id] });
    }
  };

  return (
    <>
      <div className="mt-2 flex items-center justify-between text-[0.76em] text-ink-mute">
        <span>내 별 <b className="tabular-nums text-star-d">⭐ {w.stars}</b></span>
        <button onClick={resetWallet} className="underline underline-offset-2">처음으로</button>
      </div>

      <ul className="mt-1.5 grid grid-cols-2 gap-2">
        {items.map((i) => {
          const owned = w.owned.includes(i.id);
          const short = i.cost - w.stars;
          const affordable = short <= 0;
          const locked = !owned && !affordable;
          const on = owned && equipped(i);

          return (
            <li key={i.id}
                className={`rounded-card border p-3 ${owned ? "border-primary-l bg-primary-bg" : "border-line bg-surface"}`}>
              {/*
                무엇을 사는지 보여야 고를 수 있다 — Kenney 팩이 아이템마다 준 미리보기.
                아직 못 사는 것은 회색으로 둔다 — 가진 것과 한눈에 갈린다.
              */}
              <div className="relative mb-2 grid h-[80px] place-items-center rounded-card bg-surface">
                {i.thumb ? (
                  <Image src={i.thumb} alt="" width={76} height={76} unoptimized
                         className={`h-[76px] w-[76px] object-contain ${locked ? "opacity-45 grayscale" : ""}`} />
                ) : (
                  <span className={`text-[2.6em] ${locked ? "opacity-45 grayscale" : ""}`}>
                    {i.id === "cap" ? "🧢" : "🎒"}
                  </span>
                )}
                {locked ? (
                  <span className="absolute right-1 top-1 rounded-full bg-sand px-1.5 text-[0.66em] leading-[1.6]">🔒</span>
                ) : null}
              </div>

              <div className="flex items-baseline justify-between">
                <b className="text-[0.88em]">{i.name}</b>
                {owned ? <span className="text-[0.7em] text-primary-d">가진 것</span> : null}
              </div>

              {owned ? (
                i.placement.kind === "floor" || i.placement.kind === "beside" ? (
                  <p className="mt-2 text-[0.76em] text-ink-soft">방에 놓여 있어요</p>
                ) : (
                  <button onClick={() => toggle(i)}
                          className={`mt-2 min-h-touch w-full rounded-card text-[0.82em] font-bold ${
                            on ? "border border-line bg-surface text-ink-soft" : "bg-primary text-white"}`}>
                    {i.placement.kind === "avatar" ? (on ? "입고 있어요" : "이 캐릭터로") : on ? "벗기" : "입기"}
                  </button>
                )
              ) : (
                <>
                  <p className="mt-1 text-[0.86em] tabular-nums text-star-d">⭐ {i.cost}</p>
                  {affordable ? (
                    <button onClick={() => writeWallet(buy(w, i))}
                            className="mt-2 min-h-touch w-full rounded-card bg-primary text-[0.82em] font-bold text-white">
                      바꾸기
                    </button>
                  ) : (
                    <div className="mt-2 grid gap-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-star"
                             style={{ width: `${Math.round((w.stars / i.cost) * 100)}%` }} />
                      </div>
                      <span className="text-[0.72em] text-ink-mute">{short}개 더 모으면 돼요</span>
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
