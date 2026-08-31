/**
 * 아바타 3D 장면 — three.js 공통 배선.
 *
 * 🔴 실험 중. 문서(ADR-T05 · X2 · REQ-TEC-007 · STR-003 제약)는 아직 안 고쳤다.
 *   교체 지침은 docs/plan-docs/TODO-avatar-three.md.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * 옷장 장착 지점 — 이름 규약. **에셋이 바뀌어도 이 이름은 바뀌지 않는다.**
 *
 * 규약이 없으면 아이템 벌수가 늘 때마다 붙는 자리가 어긋난다.
 * 캐릭터 GLB 는 이 이름의 노드(뼈 또는 빈 노드)를 반드시 갖는다.
 * 없으면 `resolveSocket` 이 대체 노드를 찾고, 그것도 없으면 루트에 붙인다.
 */
export const SOCKETS = {
  head: ["socket_head", "head", "Head", "mixamorigHead"],
  back: ["socket_back", "torso", "spine", "Spine", "mixamorigSpine1"],
  neck: ["socket_neck", "neck", "Neck", "head", "Head"],
} as const;
export type SocketId = keyof typeof SOCKETS;

export function resolveSocket(root: THREE.Object3D, id: SocketId): THREE.Object3D {
  for (const name of SOCKETS[id]) {
    const hit = root.getObjectByName(name);
    if (hit) return hit;
  }
  return root;
}


/**
 * 소켓에 붙인 아이템의 방향을 **캐릭터가 바라보는 쪽**으로 맞춘다.
 *
 * 소켓의 월드 회전을 그냥 상쇄하면(`quaternion = socketQ.invert()`) 아이템이 **월드 축**에
 * 고정된다. 방을 돌리면 모자와 안경만 카메라를 향한 채 남아 얼굴에서 떨어져 보인다.
 * 캐릭터 기준으로 맞춰야 머리를 따라 돈다.
 */
function alignToRoot(root: THREE.Object3D, socket: THREE.Object3D, item: THREE.Object3D) {
  const rq = new THREE.Quaternion();
  const sq = new THREE.Quaternion();
  root.getWorldQuaternion(rq);
  socket.getWorldQuaternion(sq);
  item.quaternion.copy(sq.invert().multiply(rq));

  const ws = new THREE.Vector3();
  socket.getWorldScale(ws);
  item.scale.divide(ws);
}

/**
 * 소켓에 아이템을 얹는다 — **높이를 손으로 넣지 않는다.**
 *
 * 두 가지를 나눠서 쓴다.
 *   **부모** — 소켓 노드(뼈). 애니메이션을 따라가게 하려면 여기 붙여야 한다
 *   **치수** — 캐릭터 **전체** 바운딩 박스. 뼈와 빈 노드는 메시가 없어 박스가 비어 있다
 *
 * 에셋마다 뼈 원점이 다르다 — Kenney 는 `head` 뼈가 목 근처에 있고 다른 팩은 정수리에 있다.
 * 숫자를 박아 두면 모델을 바꾸는 순간 모자가 머리에 박힌다.
 */
export function attachToSocket(
  root: THREE.Object3D,
  id: SocketId,
  item: THREE.Object3D,
  place: "on-top" | "behind" = "on-top",
  /** 캐릭터 폭 대비 아이템 폭 */
  widthRatio = 0.5,
) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const itemBox = new THREE.Box3().setFromObject(item);
  const itemSize = new THREE.Vector3();
  itemBox.getSize(itemSize);
  const fit = (size.x * widthRatio) / (Math.max(itemSize.x, itemSize.z) || 1);
  item.scale.multiplyScalar(fit);

  const target = place === "on-top"
    ? new THREE.Vector3(center.x, box.max.y - size.y * 0.02, center.z)
    : new THREE.Vector3(center.x, center.y + size.y * 0.06, box.min.z + size.z * 0.12);

  const socket = resolveSocket(root, id);
  socket.updateWorldMatrix(true, true);
  socket.add(item);
  item.position.copy(socket.worldToLocal(target.clone()));

  alignToRoot(root, socket, item);
  return item;
}

/** 렌더러 — 톤매핑·색공간·그림자를 한 곳에서 정한다 */
export function makeRenderer(size: number): THREE.WebGLRenderer | null {
  let r: THREE.WebGLRenderer;
  try {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(size, size);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;   // 색이 뜨지 않게
  r.toneMappingExposure = 0.95;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

/**
 * 장면 — 환경맵이 핵심이다.
 * RoomEnvironment 로 만든 PMREM 을 scene.environment 에 넣으면 재질에 반사가 생겨
 * 단색 도형이 「도형」으로 안 보이기 시작한다. 이미지 에셋은 필요 없다.
 */
export function makeScene(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;   // 너무 올리면 색이 바랜다

  const key = new THREE.DirectionalLight(0xfffaf0, 2.6);
  key.position.set(2.6, 4.4, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.0015;
  const c = key.shadow.camera as THREE.OrthographicCamera;
  c.left = -4; c.right = 4; c.top = 4; c.bottom = -4;
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xfff4e4, 0.18));

  return { scene, dispose: () => pmrem.dispose() };
}

/** 접지 그림자 — 캐릭터가 떠 있어 보이지 않게. 바닥 자체는 안 그린다 */
export function addGroundShadow(scene: THREE.Scene, y: number, size = 8) {
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  g.rotation.x = -Math.PI / 2;
  g.position.y = y;
  g.receiveShadow = true;
  scene.add(g);
  return g;
}

/**
 * 얼굴에 쓰는 것 — 안경 · 마스크.
 *
 * Kenney 액세서리는 **캐릭터에 정렬돼 있지 않다.** 밑면이 y=0 인 독립 소품이라
 * 소켓에 그냥 붙이면 목이나 가슴에 걸린다. 숫자로 보정하면 캐릭터를 바꾸는 순간 어긋난다.
 *
 * 그래서 **얼굴 면을 레이캐스트로 찾는다.**
 *   ① 정면에서 뒤로 쏴 얼굴 표면 z 를 잡는다
 *   ② 양옆에서 쏴 머리 폭을 잰다 — 액세서리를 그 폭에 맞춘다
 *   ③ 액세서리의 **뒷면**을 얼굴 표면에 붙이고, 눈/입 높이에 세로 중심을 맞춘다
 *
 * `yRatio` 는 캐릭터 키 대비 높이다 — 눈은 0.8, 입은 0.72 근처. 카탈로그가 들고 있다.
 */
export function attachToFace(
  root: THREE.Object3D,
  item: THREE.Object3D,
  /** 둘 다 **모델 원본 단위**다 — `head` 뼈에서 위로 얼마, 폭 얼마 */
  { up = 0.17, w = 0.22 } = {},
) {
  root.updateWorldMatrix(true, true);

  /**
   * 기준은 **`head` 뼈**다. 키가 아니다.
   *
   * 12종이 같은 리그를 쓰므로 `head` 뼈는 전부 같은 자리(0.3432)에 있지만,
   * **전체 높이는 머리카락 때문에 0.67~0.78 로 제각각**이다. 아바타를 2.6 으로 맞춰 스케일하니
   * 머리가 큰 캐릭터일수록 얼굴이 아래로 내려간다 — 키 대비로 재면 안경이 코와 입으로 흘러내린다.
   * 뼈에 붙이면 캐릭터가 바뀌어도 같은 자리다. 애니메이션도 따라간다.
   */
  const socket = resolveSocket(root, "head");
  socket.updateWorldMatrix(true, true);

  const hp = new THREE.Vector3();
  socket.getWorldPosition(hp);
  const sc = new THREE.Vector3();
  root.getWorldScale(sc);
  const S = sc.y || 1;

  const y = hp.y + up * S;

  /**
   * 얼굴 표면 — **볼 높이**에서 앞으로 쏜다.
   * 눈높이는 앞머리가 튀어나와 있어(뱅·아프로) 안경이 얼굴에서 뜬다.
   */
  const box = new THREE.Box3().setFromObject(root);
  const ray = new THREE.Raycaster();
  ray.far = (box.max.y - box.min.y) * 6;
  const hitAt = (from: THREE.Vector3, dir: THREE.Vector3) => {
    ray.set(from, dir);
    return ray.intersectObject(root, true)[0]?.point ?? null;
  };
  const cy = y - 0.035 * S;
  const front = hitAt(new THREE.Vector3(hp.x, cy, box.max.z + S), new THREE.Vector3(0, 0, -1));
  const faceZ = front ? front.z : box.max.z;

  // 크기와 자리 — 폭도 모델 단위 × 스케일이다. 머리 폭을 재면 머리카락이 잡힌다
  const ib = new THREE.Box3().setFromObject(item);
  const isz = new THREE.Vector3();
  ib.getSize(isz);
  item.scale.multiplyScalar((w * S) / (isz.x || 1));

  /**
   * 🔴 앞뒤로 **납작하게** 눌러 얼굴에 밀착시킨다.
   *
   * 안경다리까지 포함한 두께를 그대로 두면, 렌즈를 얼굴에 붙이는 순간 다리가 코 앞으로 튀어나온다.
   * 반대로 중심을 얼굴 면에 맞추면 렌즈가 얼굴 속에 박힌다.
   * 이 캐릭터는 얼굴이 평평하므로 두께를 줄이는 편이 둘 다 피한다.
   */
  item.scale.z *= 0.5;

  const ib2 = new THREE.Box3().setFromObject(item);
  const isz2 = new THREE.Vector3();
  const ic2 = new THREE.Vector3();
  ib2.getSize(isz2);
  ib2.getCenter(ic2);

  // 아이템 원점이 밑면일 수도 가운데일 수도 있다 — 바운딩 박스 기준으로 맞춘다.
  // 뒷면을 얼굴 표면에 맞춰야 **렌즈가 눈에 닿는다.**
  const target = new THREE.Vector3(
    hp.x - (ic2.x - item.position.x),
    y - (ic2.y - item.position.y),
    faceZ + isz2.z * 0.46 - (ic2.z - item.position.z),
  );

  socket.add(item);
  item.position.copy(socket.worldToLocal(target.clone()));
  alignToRoot(root, socket, item);
  return item;
}

/**
 * 등에 메는 것 — 가방.
 *
 * 🔴 캐릭터 전체 바운딩 박스로 자리를 잡으면 안 된다. 팔을 벌리고 있어 박스가 넓고,
 * 중심 높이가 가슴이 아니라 **목 근처**로 올라가 가방이 머리 옆에 뜬다.
 * `torso` 뼈에 붙이고 **모델 원본 단위**로 뒤·아래 오프셋을 준다.
 */
export function attachToBack(
  root: THREE.Object3D,
  item: THREE.Object3D,
  { up = 0.055, back = 0.075, w = 0.185 } = {},
) {
  root.updateWorldMatrix(true, true);
  const socket = resolveSocket(root, "back");
  socket.updateWorldMatrix(true, true);

  const sp = new THREE.Vector3();
  socket.getWorldPosition(sp);
  const sc = new THREE.Vector3();
  root.getWorldScale(sc);
  const S = sc.y || 1;

  const ib = new THREE.Box3().setFromObject(item);
  const isz = new THREE.Vector3();
  ib.getSize(isz);
  item.scale.multiplyScalar((w * S) / (isz.x || 1));

  const ib2 = new THREE.Box3().setFromObject(item);
  const ic2 = new THREE.Vector3();
  ib2.getCenter(ic2);

  const target = new THREE.Vector3(
    sp.x - (ic2.x - item.position.x),
    sp.y + up * S - (ic2.y - item.position.y),
    sp.z - back * S - (ic2.z - item.position.z),
  );

  socket.add(item);
  item.position.copy(socket.worldToLocal(target.clone()));
  alignToRoot(root, socket, item);
  return item;
}

/** 임의 GLB — 최대 변을 target 으로 맞추고 바닥에 앉힌다. kit 마다 원본 스케일이 다르다 */
export async function loadProp(url: string, target: number) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  root.scale.setScalar(target / (Math.max(size.x, size.y, size.z) || 1));

  const b2 = new THREE.Box3().setFromObject(root);
  const c = new THREE.Vector3();
  b2.getCenter(c);
  const holder = new THREE.Group();
  root.position.set(-c.x, -b2.min.y, -c.z);   // 발/바닥을 y=0 에
  holder.add(root);
  return { holder, clips: gltf.animations };
}

/** 캐릭터 GLB — 크기·바닥 맞춤까지 해서 돌려준다. 받은 그대로 쓰면 스케일이 제각각이다 */
export async function loadCharacter(url: string, targetHeight = 3.2) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const s = targetHeight / (size.y || 1);
  root.scale.setScalar(s);

  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box2.min.y;   // 발을 y=0 에 붙인다

  return { root, clips: gltf.animations, footY: 0 };
}
