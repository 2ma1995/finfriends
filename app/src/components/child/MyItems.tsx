"use client";

import { useState } from "react";
import Image from "next/image";
import { CATEGORIES, byCategory, type Category } from "@/contracts/items";

/**
 * 내 아이템 — 🔴 **한 줄로 접어 두고, 고른 것만 아래에 편다.**
 *
 * 예전엔 6칸짜리 격자가 늘 펼쳐져 있었고, 각 칸을 누르면 **상점으로 나갔다.**
 * 그래서 「내 아이템」이라는 제목 아래에서 **내가 가진 것을 볼 수가 없었다** —
 * 보이는 건 `3/12` 같은 숫자뿐이었고, 누르면 방을 떠났다.
 *
 * 🔴 **가진 것만 보여준다.** 못 산 것은 상점의 몫이다. 여기서까지 회색 자물쇠를
 *    늘어놓으면 「내 것」 자리가 「아직 없는 것」 목록이 된다.
 *
 * 🔴 **클라이언트 상태로 연다.** 주소(`?cat=`)로 열면 누를 때마다 화면이 다시 그려지고
 *    3D 방(`RoomStage`)이 통째로 다시 뜬다. 카테고리 하나 보려다 방이 껌뻑인다.
 */
export function MyItems({
  owned, placedCount, title, emptyCat, hint,
}: {
  owned: readonly string[];
  placedCount: number;
  /** 🔴 `{n}` 은 놓은 개수. 숫자는 여기가 채운다 — 문구는 fixture 가 갖는다 */
  title: string;
  emptyCat: string;
  hint: string;
}) {
  const [open, setOpen] = useState<Category | null>(null);
  const mineOf = (k: Category) => byCategory(k).filter((i) => owned.includes(i.id));
  const items = open ? mineOf(open) : [];

  return (
    <>
      {/*
        🔴 **상점으로 가는 길을 여기 두지 않는다.** 방 안에 🛍 버튼이 이미 있다 —
           「내 아이템」은 **가진 것을 보는 자리**이고, 옆에 사러 가는 길을 붙이면
           그 자리가 다시 상점 입구가 된다. 한 화면에 같은 문이 둘일 이유도 없다.
      */}
      <h2 className="mb-2 mt-7 text-title font-bold leading-none">{title.replace("{n}", String(placedCount))}</h2>

      {/*
        🔴 **일곱을 한 줄에 넣는다.** 좁은 폰에서 두 줄로 접히면 「작게 한 줄」이 아니게 된다.
        🔴 높이는 줄이되 **터치 하한(44px)은 지킨다** — 아이 손가락은 조준이 나쁘다.
      */}
      <ul className="mt-1.5 grid grid-cols-7 gap-1">
        {CATEGORIES.map((c) => {
          const n = mineOf(c.key).length;
          const on = open === c.key;
          return (
            <li key={c.key}>
              <button type="button"
                      aria-pressed={on}
                      onClick={() => setOpen(on ? null : c.key)}
                      className={`grid min-h-touch w-full place-items-center rounded-card border py-1 text-center ${
                        on ? "border-primary bg-primary-bg" : "border-line bg-surface"}
                        ${n === 0 ? "opacity-45" : ""}`}>
                <span className="text-[1.05em] leading-none">{c.emoji}</span>
                {/* 🔴 **가진 개수만 적는다.** 예전엔 `3/12` 였다 — 「내 것」 옆에 붙는
                       분모는 가진 것을 세는 숫자가 아니라 **못 가진 것을 세는 숫자**다 */}
                <span className={`text-micro leading-none tabular-nums ${
                  on ? "font-bold text-primary-d" : "text-ink-mute"}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 🔴 고른 줄 **바로 아래**에 편다. 다른 데 열면 무엇을 눌렀는지 잊는다 */}
      {open ? (
        items.length > 0 ? (
          <ul className="mt-1.5 grid grid-cols-4 gap-1.5">
            {items.map((i) => (
              <li key={i.id} className="min-w-0 rounded-card bg-surface p-1.5 text-center">
                <div className="grid h-[52px] place-items-center rounded-card bg-sand">
                  {i.thumb ? (
                    <Image src={i.thumb} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
                  ) : (
                    <span className="text-[1.6em]">{i.category === "wear" ? "🧢" : "📦"}</span>
                  )}
                </div>
                <span className="mt-1 block truncate text-micro">{i.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          /* 🔴 **빈 칸도 말한다.** 아무것도 안 나오면 아이는 「고장났나」로 읽는다.
                 다만 **사러 가라고 밀지 않는다** — 없다는 사실만 말하고 끝낸다 */
          <p className="mt-1.5 rounded-card border border-dashed border-line-2 px-3 py-2.5 text-center text-cap text-ink-mute">
            {emptyCat}
          </p>
        )
      ) : (
        <p className="mt-1 text-center text-cap text-ink-mute">{hint}</p>
      )}
    </>
  );
}
