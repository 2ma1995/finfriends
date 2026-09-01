"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  makeRenderer, makeScene, loadCharacter, loadProp, attachToSocket, attachToFace, attachToBack,
} from "./avatar-scene";
import type { Item } from "@/contracts/items";

/**
 * 🔴 실험 — 아이 방 3D.
 *
 * 두 가지 모드가 있다.
 *   보기    방을 끌어서 돌린다
 *   꾸미기  아이템을 눌러 고르고 끌어서 옮긴다. 회전·되돌리기
 *
 * 아이템은 두 갈래로 갈린다 — **소켓에 붙는 것**과 **바닥에 놓는 것**.
 * 카탈로그(`room.fixture.ts`)가 어느 쪽인지 들고 있고 이 컴포넌트는 그대로 따른다.
 * 에셋은 전부 Kenney CC0 — `public/models/LICENSE.md`.
 */
export type Layout = Record<string, { x: number; z: number; ry: number; y?: number }>;

/** 아이템이 차지하는 자리 — 아래로 쏠 지점을 잡을 때 쓴다 */
type Footprint = { hw: number; hd: number; h: number };

/**
 * 바닥을 짚어 볼 지점 — 가운데 + 발자국 네 귀퉁이.
 * 가운데만 보면 책상 가장자리에 걸친 물건이 공중에 뜬다.
 */
function probePoints(f: Footprint, ry: number): [number, number][] {
  const hw = f.hw * 0.62, hd = f.hd * 0.62;
  const c = Math.cos(ry), s = Math.sin(ry);
  return ([[0, 0], [hw, hd], [-hw, hd], [hw, -hd], [-hw, -hd]] as [number, number][])
    .map(([x, z]) => [x * c + z * s, -x * s + z * c] as [number, number]);
}

/**
 * 모자 — 크라운 + 챙.
 * 🔴 챙을 크라운 반지름만큼 앞으로 빼면 **떨어진 원반**처럼 보인다(모자가 두 개로 읽힌다).
 * 크라운에 겹치게 두고 앞쪽만 조금 나오게 한다.
 */
function makeHat() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x3b7dd8, roughness: 0.45, clearcoat: 0.4 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.34, 28), mat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 28), mat);
  brim.position.set(0, -0.16, 0.2);
  brim.scale.set(1.16, 1, 1.02);
  g.add(crown, brim);
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}
function makeBag() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.3),
    new THREE.MeshPhysicalMaterial({ color: 0xd0453c, roughness: 0.55, clearcoat: 0.25 }));
  m.castShadow = true;
  return m;
}

/** 고른 아이템 표시 — 바닥에 링 하나. 아이가 무엇을 잡았는지 알아야 한다 */
function makeRing() {
  const r = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.68, 40),
    new THREE.MeshBasicMaterial({ color: 0x4f7a4a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  r.rotation.x = -Math.PI / 2;
  r.position.y = 0.02;
  r.visible = false;
  return r;
}

const FLOOR_R = 4.4;   // 아이템이 나갈 수 있는 범위

export function Room3D({
  items, character, wear, size = 300, turn = 0, edit = false, layout, onMove, onSelect, selectedId,
}: {
  items: readonly Item[];
  /** 지금 입고 있는 캐릭터 GLB */
  character: string;
  /** 지금 착용 중인 것 — 아이템 id 목록 */
  wear: readonly Item[];
  size?: number;
  turn?: number;
  edit?: boolean;
  layout: Layout;
  onMove?: (id: string, pos: { x: number; z: number; ry: number; y: number }, all: Layout) => void;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // 콜백이 바뀔 때마다 장면을 다시 만들지 않는다.
  // 🔴 렌더 중에 ref 를 쓰지 않는다 — effect 에서 갱신한다 (React 19 규칙)
  const cbs = useRef({ onMove, onSelect });
  const layoutRef = useRef(layout);
  useEffect(() => { cbs.current = { onMove, onSelect }; });
  useEffect(() => { layoutRef.current = layout; });

  const api = useRef<{
    holders: Map<string, THREE.Object3D>;
    prints: Map<string, Footprint>;
    supports: Set<string>;
    tags: Map<string, HTMLDivElement>;
    ring: THREE.Mesh | null;
    room: THREE.Group | null;
  }>({ holders: new Map(), prints: new Map(), supports: new Set(), tags: new Map(), ring: null, room: null });

  // 바깥에서 고른 것 · 좌표가 바뀌면 장면에 반영한다
  useEffect(() => {
    const { holders, ring } = api.current;
    for (const [id, h] of holders) {
      const p = layout[id];
      if (p) { h.position.set(p.x, p.y ?? 0, p.z); h.rotation.y = (p.ry * Math.PI) / 180; }
      if (ring && selectedId === id) {
        ring.position.set(h.position.x, h.position.y + 0.02, h.position.z);
        ring.visible = true;
      }
    }
    if (ring && !selectedId) ring.visible = false;

    for (const [id, d] of api.current.tags) {
      const on = id === selectedId;
      d.style.background = on ? "#4f7a4a" : "rgba(255,255,255,.92)";
      d.style.color = on ? "#ffffff" : "#2b2118";
      d.style.borderColor = on ? "#3e6b3a" : "#e0d2bc";
    }
  }, [layout, selectedId]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const self = api.current;
    let alive = true;

    const renderer = makeRenderer(size);
    if (!renderer) {
      // 🔴 effect 본문에서 바로 setState 하지 않는다 — 연쇄 렌더가 난다
      queueMicrotask(() => setState("failed"));
      return;
    }
    const h = Math.round(size * 0.78);
    renderer.setSize(size, h);
    el.appendChild(renderer.domElement);

    /**
     * 이름표 — 꾸미기 모드에서만 띄운다.
     * three 위에 평범한 DOM 을 얹고 **프레임마다 위치만** 바꾼다.
     * React 상태로 올리면 매 프레임 리렌더가 돌아 방이 버벅인다.
     */
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none";
    el.appendChild(overlay);
    const tags = api.current.tags;
    tags.clear();
    const makeTag = (id: string, name: string) => {
      const d = document.createElement("div");
      d.textContent = name;
      d.dataset.id = id;
      d.style.cssText =
        "position:absolute;transform:translate(-50%,-100%);white-space:nowrap;" +
        "padding:2px 7px;border-radius:999px;font-size:10px;line-height:1.5;font-weight:700;" +
        "background:rgba(255,255,255,.92);color:#2b2118;border:1px solid #e0d2bc;" +
        "box-shadow:0 1px 3px rgba(42,39,36,.18);pointer-events:none";
      overlay.appendChild(d);
      tags.set(id, d);
      return d;
    };

    const { scene, dispose } = makeScene(renderer);
    const camera = new THREE.PerspectiveCamera(34, size / h, 0.1, 100);
    camera.position.set(0, 4.4, 9.6);
    camera.lookAt(0, 1.0, 0);

    const room = new THREE.Group();
    room.rotation.y = (turn * Math.PI) / 180;
    scene.add(room);
    api.current.room = room;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7.4, 56),
      new THREE.MeshStandardMaterial({ color: 0xdcc7a6, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    const ring = makeRing();
    room.add(ring);
    api.current.ring = ring;

    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();
    const holders = api.current.holders;
    holders.clear();

    (async () => {
      const { root, clips } = await loadCharacter(character, 2.6);
      if (!alive) return;
      root.position.set(-0.3, 0, 0.4);
      room.add(root);

      /**
       * 착용 아이템 — 도형이거나 GLB. 소켓 규약은 같다.
       *
       * 🔴 **먼저 다 받아 두고 한 번에 붙인다.** 붙이는 동안에는 방 회전을 0 으로 되돌리는데,
       * 그 사이에 GLB 를 기다리면 방이 정면으로 돌아간 채 몇 초를 서 있는다.
       * (얼굴 면·볼 폭을 월드 축 광선으로 재기 때문에 0 으로 돌려야 한다.)
       */
      const loaded: { it: Item; obj: THREE.Object3D }[] = [];
      for (const it of wear) {
        if (it.placement.kind !== "socket") continue;
        let obj: THREE.Object3D | null = null;
        if (it.model) {
          try { obj = (await loadProp(it.model, it.size || 0.6)).holder; } catch { obj = null; }
        } else {
          obj = it.id === "cap" ? makeHat() : makeBag();
        }
        if (obj) loaded.push({ it, obj });
      }
      if (!alive) return;

      const keepRot = room.rotation.y;
      room.rotation.y = 0;
      room.updateMatrixWorld(true);

      for (const { it, obj } of loaded) {
        const onTop = it.placement.kind === "socket" && it.placement.socket === "head";
        if (it.face) attachToFace(root, obj, it.face);
        else if (it.placement.kind === "socket") {
          // 머리 위 · 등 뒤 — 둘 다 **뼈 기준**이다. 전체 바운딩 박스는 팔 때문에 못 쓴다
          if (onTop) attachToSocket(root, "head", obj, "on-top", 0.38);
          else attachToBack(root, obj);
        }
      }

      room.rotation.y = keepRot;
      room.updateMatrixWorld(true);


      const idle = clips.find((c) => c.name === "idle") ?? clips[0];
      if (idle) { mixer = new THREE.AnimationMixer(root); mixer.clipAction(idle).play(); }
      setState("ready");

      for (const it of items) {
        if (!it.model || it.placement.kind === "socket") continue;
        try {
          const { holder } = await loadProp(it.model, it.size);
          if (!alive) return;
          holder.userData.itemId = it.id;
          const bb = new THREE.Box3().setFromObject(holder);
          const bs = new THREE.Vector3();
          bb.getSize(bs);
          api.current.prints.set(it.id, { hw: bs.x / 2, hd: bs.z / 2, h: bs.y });
          // 펫은 받침으로 쓰지 않는다 — 고양이 위에 케이크가 올라가면 이상하다
          if (it.placement.kind === "floor") api.current.supports.add(it.id);

          const p = layoutRef.current[it.id];
          if (p) { holder.position.set(p.x, p.y ?? 0, p.z); holder.rotation.y = (p.ry * Math.PI) / 180; }
          holders.set(it.id, holder);
          room.add(holder);
          if (edit) makeTag(it.id, it.name);
        } catch { /* 하나 실패해도 방은 그린다 */ }
      }
    })().catch(() => alive && setState("failed"));

    /**
     * (x, z) 에 놓을 때 **실제로 닿는 면의 높이** — 위에서 아래로 쏘아 찾는다.
     *
     * 발자국 겹침으로 재던 방식은 **책상 가장자리에 걸친 물건을 책상 높이로** 띄웠다.
     * 실제 면을 짚으면 걸친 쪽은 걸친 만큼만 올라간다.
     * 가운데 한 점만 보면 반대 문제가 생기므로 **다섯 점**을 짚고 그중 제일 높은 면을 쓴다.
     */
    const DOWN = new THREE.Vector3(0, -1, 0);
    const downRay = new THREE.Raycaster();
    downRay.far = 80;

    const surfaceY = (
      id: string,
      x: number, z: number, ry: number,
      /**
       * 받침의 **밑면**이 이 높이보다 높으면 후보에서 뺀다.
       * 잡은 물건 위에 얹혀 있던 것에 다시 올라타는 되먹임을 막는다.
       * 면 높이가 아니라 밑면으로 걸러야 한다 — 그래야 바닥 물건이 책상 위로 올라간다.
       */
      maxBaseY = Infinity,
      /** 받침 후보. 안 주면 펫을 뺀 모든 아이템 */
      only?: string[],
    ) => {
      const { holders: hs, prints, supports } = api.current;
      const targets: THREE.Object3D[] = [floor];
      for (const [oid, oh] of hs) {
        if (oid === id || !supports.has(oid)) continue;
        if (only && !only.includes(oid)) continue;
        if (oh.position.y > maxBaseY) continue;
        targets.push(oh);
      }

      const f = prints.get(id) ?? { hw: 0.2, hd: 0.2, h: 0.2 };
      const origin = new THREE.Vector3();
      let top = 0;
      for (const [ox, oz] of probePoints(f, ry)) {
        origin.set(x + ox, 60, z + oz);
        room.localToWorld(origin);          // 방이 돌아 있어도 아래 방향은 그대로다
        downRay.set(origin, DOWN);
        const hit = downRay.intersectObjects(targets, true)[0];
        if (hit) top = Math.max(top, hit.point.y);
      }
      return +Math.max(0, top).toFixed(3);
    };

    /**
     * 전체 재정렬 — 놓은 뒤에 한 번 돌린다.
     * 낮은 것부터 확정해 나가면 순환이 생기지 않는다. 받침을 치우면 위의 것이 내려온다.
     */
    const restack = () => {
      const { holders: hs } = api.current;
      const ids = [...hs.keys()].sort((p, q) => hs.get(p)!.position.y - hs.get(q)!.position.y);
      const done: string[] = [];
      for (const id of ids) {
        const h = hs.get(id)!;
        h.position.y = surfaceY(id, h.position.x, h.position.z, h.rotation.y, Infinity, done);
        h.updateWorldMatrix(true, true);
        done.push(id);
      }
      return Object.fromEntries([...hs].map(([id, h]) => [id, {
        x: +h.position.x.toFixed(2), z: +h.position.z.toFixed(2),
        y: +h.position.y.toFixed(3), ry: Math.round((h.rotation.y * 180) / Math.PI),
      }]));
    };

    let raf = 0;
    const tagPos = new THREE.Vector3();
    const syncTags = () => {
      if (!tags.size) return;
      for (const [id, d] of tags) {
        const holder = api.current.holders.get(id);
        const f = api.current.prints.get(id);
        if (!holder || !f) { d.style.display = "none"; continue; }
        tagPos.set(0, f.h + 0.18, 0);
        holder.localToWorld(tagPos);
        tagPos.project(camera);
        if (tagPos.z > 1) { d.style.display = "none"; continue; }   // 카메라 뒤
        d.style.display = "";
        d.style.left = `${((tagPos.x + 1) / 2) * size}px`;
        d.style.top = `${((-tagPos.y + 1) / 2) * h}px`;
      }
    };
    const tick = () => {
      mixer?.update(clock.getDelta());
      renderer.render(scene, camera);
      syncTags();
      raf = requestAnimationFrame(tick);
    };
    tick();

    // ── 조작 ───────────────────────────────────────────────
    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    let mode: "none" | "orbit" | "drag" = "none";
    let lastX = 0;
    let dragId: string | null = null;
    let grabY = 0;                    // 잡을 때의 밑면 높이 — 받침 후보를 거르는 기준
    const grabOff = new THREE.Vector3();

    const toNdc = (e: PointerEvent) => {
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const pickItem = () => {
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects([...holders.values()], true);
      if (!hits.length) return null;
      let o: THREE.Object3D | null = hits[0].object;
      while (o && !o.userData.itemId) o = o.parent;
      return (o?.userData.itemId as string) ?? null;
    };
    const floorPoint = () => {
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, hitPoint) ? hitPoint.clone() : null;
    };

    const down = (e: PointerEvent) => {
      dom.setPointerCapture(e.pointerId);
      toNdc(e);
      lastX = e.clientX;
      if (!edit) { mode = "orbit"; dom.style.cursor = "grabbing"; return; }

      const id = pickItem();
      cbs.current.onSelect?.(id);
      if (id) {
        const holder = holders.get(id)!;
        const p = floorPoint();
        // 방이 회전해 있으면 월드↔로컬을 맞춰야 아이템이 튀지 않는다
        if (p) { room.worldToLocal(p); grabOff.copy(holder.position).sub(p); }
        grabY = holder.position.y;
        dragId = id;
        mode = "drag";
      } else {
        mode = "orbit";
        dom.style.cursor = "grabbing";
      }
    };

    const move = (e: PointerEvent) => {
      if (mode === "none") return;
      toNdc(e);
      if (mode === "orbit") {
        room.rotation.y += (e.clientX - lastX) * 0.01;
        lastX = e.clientX;
        return;
      }
      if (mode === "drag" && dragId) {
        const p = floorPoint();
        if (!p) return;
        room.worldToLocal(p);
        p.add(grabOff);
        const r = Math.hypot(p.x, p.z);
        if (r > FLOOR_R) { p.x = (p.x / r) * FLOOR_R; p.z = (p.z / r) * FLOOR_R; }
        const holder = holders.get(dragId)!;
        // 파고들지 않고 **닿는 면 위로 얹는다**
        const y = surfaceY(dragId, p.x, p.z, holder.rotation.y, grabY + 1e-3);
        holder.position.set(p.x, y, p.z);
        ring.position.set(p.x, y + 0.02, p.z);
        ring.visible = true;
      }
    };

    const up = () => {
      if (mode === "drag" && dragId) {
        const next = restack();               // 받침이 사라졌으면 위의 것이 내려온다
        const holder = holders.get(dragId)!;
        ring.position.set(holder.position.x, holder.position.y + 0.02, holder.position.z);
        cbs.current.onMove?.(dragId, next[dragId], next);
      }
      mode = "none"; dragId = null;
      dom.style.cursor = edit ? "pointer" : "grab";
    };

    dom.style.cursor = edit ? "pointer" : "grab";
    dom.addEventListener("pointerdown", down);
    dom.addEventListener("pointermove", move);
    dom.addEventListener("pointerup", up);
    dom.addEventListener("pointercancel", up);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      dom.removeEventListener("pointercancel", up);
      mixer?.stopAllAction();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      dispose(); renderer.dispose(); dom.remove(); overlay.remove(); tags.clear();
      // 🔴 cleanup 이 도는 시점엔 ref 가 바뀌어 있을 수 있다. effect 안에서 잡아 둔 것을 쓴다
      self.holders = new Map(); self.ring = null; self.room = null;
    };
  }, [items, character, wear, size, turn, edit]);

  if (state === "failed") {
    return (
      <div className="grid h-[220px] place-items-center rounded-card bg-sand text-center">
        <p className="text-[0.82em] text-ink-soft">🐻<br />이 기기에서는 3D를 못 그려요</p>
      </div>
    );
  }

  return <div ref={host} className="relative" style={{ width: size, height: Math.round(size * 0.78) }} />;
}
