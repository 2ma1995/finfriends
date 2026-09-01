"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CATALOG, DEFAULT_CHARACTER, type Item } from "@/contracts/items";
import { saveLayoutAction } from "@/app/actions/items";
import type { Layout } from "./Room3D";

/** three 는 늦게 부른다 — 홈 첫 페인트를 막지 않아야 한다 (STR-003 제약) */
const Room3D = dynamic(() => import("./Room3D").then((m) => m.Room3D), {
  ssr: false,
  loading: () => <div className="h-[234px] w-[300px] animate-pulse rounded-card bg-sand" />,
});

function baseLayout(items: readonly Item[]): Layout {
  const out: Layout = {};
  for (const i of items) {
    if (i.placement.kind === "floor") out[i.id] = { x: i.placement.x, z: i.placement.z, ry: i.placement.ry ?? 0 };
    if (i.placement.kind === "beside") out[i.id] = { x: 1.25, z: 1.35, ry: -34 };
  }
  return out;
}

export function RoomStage({
  items, layout: saved, characterId, wear, turn = 0, startEdit = false, sideAction,
}: {
  items: readonly Item[];
  /** 🔴 서버가 준다. 예전엔 localStorage 에 있어서 기기를 바꾸면 방이 사라졌다 */
  layout: Record<string, { x: number; z: number; ry: number; y?: number }>;
  characterId: string;
  wear: readonly string[];
  turn?: number;
  startEdit?: boolean;
  /**
   * 🔴 「방 꾸미기」 **옆에** 놓을 것. 상점은 서버 링크라 여기서 만들 수 없어 밖에서 받는다.
   *    둘은 「방을 바꾸는 일」로 같은 묶음이다 — 떨어뜨려 놓으면 아이가 서로 다른 일로 안다.
   */
  sideAction?: ReactNode;
}) {
  const charModel = useMemo(
    () => CATALOG.find((i) => i.id === characterId)?.model
       ?? CATALOG.find((i) => i.id === DEFAULT_CHARACTER)?.model
       ?? "/models/characters/character-female-b.glb",
    [characterId],
  );
  const wearItems = useMemo(
    () => CATALOG.filter((i) => wear.includes(i.id) && i.placement.kind === "socket"),
    [wear],
  );
  const base = useMemo(() => baseLayout(items), [items]);

  /**
   * 🔴 **서버 값을 state 로 복사하지 않는다.** 예전엔 effect 로 맞췄는데,
   *    그러면 새로 산 물건이 들어올 때 화면이 두 번 그려지고 손이 끊긴다.
   *    서버가 준 배치 위에 **이번에 움직인 것만** 덮는다 — 파생 값이다.
   */
  const [moved, setMoved] = useState<Layout>({});
  const layout = useMemo<Layout>(() => ({ ...base, ...saved, ...moved }), [base, saved, moved]);
  const [edit, setEdit] = useState(startEdit);
  const [sel, setSel] = useState<string | null>(null);

  // 🔴 화면을 먼저 움직이고 저장은 뒤따른다. 저장을 기다리면 끄는 손이 끊긴다.
  //    실패해도 되돌리지 않는다 — 다음 조작이 다시 저장한다
  const persist = useCallback((next: Layout) => {
    setMoved(next);
    void saveLayoutAction(next).catch(() => { /* 다음 조작에서 다시 보낸다 */ });
  }, []);

  // 놓을 때 방 전체가 다시 정렬돼서 온다 — 받침을 치우면 위의 것이 내려온다
  const onMove = useCallback((id: string, _p: { x: number; z: number; ry: number; y: number }, all: Layout) => {
    persist({ ...layout, ...all });
  }, [layout, persist]);

  const rotate = (deg: number) => {
    if (!sel) return;
    const cur = layout[sel] ?? { x: 0, z: 0, ry: 0 };
    persist({ ...layout, [sel]: { ...cur, ry: cur.ry + deg } });
  };

  const drop = () => {
    if (!sel) return;
    const cur = layout[sel];
    if (!cur) return;
    persist({ ...layout, [sel]: { ...cur, y: 0 } });   // 바닥으로 내린다
  };

  const reset = () => {
    setSel(null);
    persist(base);
  };

  const selName = sel ? items.find((i) => i.id === sel)?.name : null;
  /** 방에 놓인 것만 — 착용(모자·가방)은 아바타에 붙어 있어 옮길 수 없다 */
  const movable = items.filter((i) => i.placement.kind !== "socket");

  return (
    <div className="grid justify-items-center gap-2">
      <div className={edit ? "rounded-card ring-2 ring-primary" : undefined}>
        <Room3D items={items} character={charModel} wear={wearItems}
                turn={turn} edit={edit} layout={layout}
                onMove={onMove} onSelect={setSel} selectedId={sel} />
      </div>

      {edit ? (
        <>
          {/* 목록 — 다른 물건에 가려 안 눌리는 것도 여기서 고른다 */}
          <ul className="flex w-full flex-wrap justify-center gap-1">
            {movable.map((i) => {
              const on = i.id === sel;
              const up = (layout[i.id]?.y ?? 0) > 0.001;
              return (
                <li key={i.id}>
                  <button onClick={() => setSel(on ? null : i.id)}
                          className={`min-h-touch rounded-card border px-2.5 text-[0.74em] ${
                            on ? "border-primary bg-primary text-white font-bold" : "border-line bg-surface"}`}>
                    {i.name}{up ? " ↑" : ""}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="text-[0.74em] text-ink-soft">
            {selName ? (
              <>
                「{selName}」를 골랐어요 · <b>끌어서 옮기기</b>
                {layout[sel!]?.y ? <> · 위에 얹혀 있어요</> : null}
              </>
            ) : "옮기고 싶은 것을 눌러 보세요"}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button onClick={() => rotate(-45)} disabled={!sel}
                    className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.8em] disabled:opacity-40">↺ 왼쪽</button>
            <button onClick={() => rotate(45)} disabled={!sel}
                    className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.8em] disabled:opacity-40">↻ 오른쪽</button>
            <button onClick={drop} disabled={!sel || !(layout[sel]?.y)}
                    className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.8em] disabled:opacity-40">↓ 바닥에</button>
            <button onClick={reset}
                    className="min-h-touch rounded-card border border-line bg-surface px-3 text-[0.8em]">처음으로</button>
            <button onClick={() => { setEdit(false); setSel(null); }}
                    className="min-h-touch rounded-card bg-primary px-4 text-[0.84em] font-bold text-white">다 꾸몄어요</button>
          </div>
        </>
      ) : (
        <>
          <span className="text-[0.72em] text-ink-mute">끌어서 방을 돌려보기</span>
          {/* 🔴 방을 바꾸는 두 가지를 나란히 둔다 — 꾸미기와 사기 */}
          <div className={`grid w-full gap-1.5 ${sideAction ? "grid-cols-2" : ""}`}>
            <button onClick={() => setEdit(true)}
                    className="min-h-touch w-full rounded-card border-2 border-primary bg-primary-bg text-[0.88em] font-bold text-primary-d">
              🛠 방 꾸미기
            </button>
            {sideAction}
          </div>
        </>
      )}
    </div>
  );
}
