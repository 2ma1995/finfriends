/**
 * 아이템 카탈로그 — **코드다.** 에셋(GLB·썸네일) 정의이지 회원 데이터가 아니다.
 * 그래서 DB 가 아니라 여기 있다. DB 는 **누가 무엇을 가졌는가**만 안다 (`activity.child_items`).
 *
 * 아이템은 두 종류다 — **붙는 것**과 **놓는 것**. 이 구분이 설계의 핵심이다.
 *   착용(`socket`)  아바타 뼈에 붙는다. 모자·가방·안경
 *   배치(`floor`)   방 바닥에 놓는다. 가구·화분·자동차
 *   펫(`beside`)    아바타 옆에 선다
 *
 * 🔴 별은 **앱 안에서만** 쓴다. 현물·현금·제휴처 경로를 만들지 않는다 (P-21).
 */

export type Category = "character" | "wear" | "pet" | "furniture" | "nature" | "food" | "vehicle";

export const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: "character", label: "캐릭터",   emoji: "🧍" },
  { key: "wear",      label: "옷장",     emoji: "🧢" },
  { key: "pet",       label: "펫",       emoji: "🐾" },
  { key: "furniture", label: "가구",     emoji: "🛏" },
  { key: "nature",    label: "화분",     emoji: "🌷" },
  { key: "food",      label: "먹을 것",  emoji: "🍰" },
  { key: "vehicle",   label: "탈것",     emoji: "🚗" },
];

export type Placement =
  /** 아바타 그 자체 — 한 번에 하나만 입는다 */
  | { kind: "avatar" }
  | { kind: "socket"; socket: "head" | "back" }
  | { kind: "floor"; x: number; z: number; ry?: number }
  | { kind: "beside" };

export type Item = {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  /** null 이면 도형으로 그린다 (모자·가방) */
  readonly model: string | null;
  /**
   * 상점 카드에 그릴 그림. Kenney 팩이 아이템마다 미리보기를 같이 준다 —
   * 64×64 PNG 라 따로 렌더링할 필요가 없다. 도형 아이템은 null 이고 이모지로 대신한다.
   */
  readonly thumb: string | null;
  /** 월드 기준 최대 변 길이 — kit 마다 원본 스케일이 달라 여기서 통일한다 */
  readonly size: number;
  readonly cost: number;
  readonly placement: Placement;
  /**
   * 얼굴에 쓰는 것 — **`head` 뼈에서 위로 얼마(`up`), 폭 얼마(`w`)**. 둘 다 모델 원본 단위다.
   * 🔴 키 대비로 재면 안 된다 — 머리뼈는 12종이 같은 자리인데 **전체 높이는 머리카락 때문에
   * 0.67~0.78 로 다르다.** 키 기준이면 머리 큰 캐릭터에서 안경이 코로 흘러내린다.
   */
  readonly face?: { up: number; w: number };
};

export const CATALOG: readonly Item[] = [
  // 캐릭터 — 한 번에 하나만 입는다
  { id: "char-fb", name: "여름이", category: "character", model: "/models/characters/character-female-b.glb", thumb: "/thumbs/character-female-b.png", size: 0, cost: 0, placement: { kind: "avatar" } },
  { id: "char-fa", name: "가을이", category: "character", model: "/models/characters/character-female-a.glb", thumb: "/thumbs/character-female-a.png", size: 0, cost: 12, placement: { kind: "avatar" } },
  { id: "char-fc", name: "서연", category: "character", model: "/models/characters/character-female-c.glb", thumb: "/thumbs/character-female-c.png", size: 0, cost: 12, placement: { kind: "avatar" } },
  { id: "char-fd", name: "다온", category: "character", model: "/models/characters/character-female-d.glb", thumb: "/thumbs/character-female-d.png", size: 0, cost: 18, placement: { kind: "avatar" } },
  { id: "char-fe", name: "하늘", category: "character", model: "/models/characters/character-female-e.glb", thumb: "/thumbs/character-female-e.png", size: 0, cost: 18, placement: { kind: "avatar" } },
  { id: "char-ff", name: "별이", category: "character", model: "/models/characters/character-female-f.glb", thumb: "/thumbs/character-female-f.png", size: 0, cost: 24, placement: { kind: "avatar" } },
  { id: "char-ma", name: "도윤", category: "character", model: "/models/characters/character-male-a.glb", thumb: "/thumbs/character-male-a.png", size: 0, cost: 12, placement: { kind: "avatar" } },
  { id: "char-mb", name: "시우", category: "character", model: "/models/characters/character-male-b.glb", thumb: "/thumbs/character-male-b.png", size: 0, cost: 12, placement: { kind: "avatar" } },
  { id: "char-mc", name: "준", category: "character", model: "/models/characters/character-male-c.glb", thumb: "/thumbs/character-male-c.png", size: 0, cost: 18, placement: { kind: "avatar" } },
  { id: "char-md", name: "은우", category: "character", model: "/models/characters/character-male-d.glb", thumb: "/thumbs/character-male-d.png", size: 0, cost: 18, placement: { kind: "avatar" } },
  { id: "char-me", name: "지호", category: "character", model: "/models/characters/character-male-e.glb", thumb: "/thumbs/character-male-e.png", size: 0, cost: 24, placement: { kind: "avatar" } },
  { id: "char-mf", name: "민재", category: "character", model: "/models/characters/character-male-f.glb", thumb: "/thumbs/character-male-f.png", size: 0, cost: 24, placement: { kind: "avatar" } },

  // 착용 — 소켓에 붙는다. 도형이거나 GLB
  { id: "cap", name: "모자", category: "wear", model: null, thumb: null, size: 0, cost: 5, placement: { kind: "socket", socket: "head" } },
  { id: "bag", name: "가방", category: "wear", model: null, thumb: null, size: 0, cost: 8, placement: { kind: "socket", socket: "back" } },
  { id: "glasses", name: "안경", category: "wear", model: "/models/characters/aid-glasses.glb", thumb: "/thumbs/aid-glasses.png", size: 0.62, cost: 6, placement: { kind: "socket", socket: "head" }, face: { up: 0.170, w: 0.268 } },
  { id: "sunglasses", name: "선글라스", category: "wear", model: "/models/characters/aid-sunglasses.glb", thumb: "/thumbs/aid-sunglasses.png", size: 0.62, cost: 9, placement: { kind: "socket", socket: "head" }, face: { up: 0.170, w: 0.268 } },

  // pet
  { id: "cat", name: "고양이", category: "pet", model: "/models/pets/animal-cat.glb", thumb: "/thumbs/animal-cat.png", size: 1.5, cost: 20, placement: { kind: "beside" } },
  { id: "dog", name: "강아지", category: "pet", model: "/models/pets/animal-dog.glb", thumb: "/thumbs/animal-dog.png", size: 1.5, cost: 20, placement: { kind: "beside" } },
  { id: "bunny", name: "토끼", category: "pet", model: "/models/pets/animal-bunny.glb", thumb: "/thumbs/animal-bunny.png", size: 1.3, cost: 25, placement: { kind: "beside" } },
  { id: "fox", name: "여우", category: "pet", model: "/models/pets/animal-fox.glb", thumb: "/thumbs/animal-fox.png", size: 1.5, cost: 30, placement: { kind: "beside" } },
  { id: "penguin", name: "펭귄", category: "pet", model: "/models/pets/animal-penguin.glb", thumb: "/thumbs/animal-penguin.png", size: 1.4, cost: 35, placement: { kind: "beside" } },
  { id: "panda", name: "판다", category: "pet", model: "/models/pets/animal-panda.glb", thumb: "/thumbs/animal-panda.png", size: 1.6, cost: 45, placement: { kind: "beside" } },
  { id: "koala", name: "코알라", category: "pet", model: "/models/pets/animal-koala.glb", thumb: "/thumbs/animal-koala.png", size: 1.4, cost: 40, placement: { kind: "beside" } },
  { id: "parrot", name: "앵무새", category: "pet", model: "/models/pets/animal-parrot.glb", thumb: "/thumbs/animal-parrot.png", size: 1.2, cost: 28, placement: { kind: "beside" } },
  { id: "deer", name: "사슴", category: "pet", model: "/models/pets/animal-deer.glb", thumb: "/thumbs/animal-deer.png", size: 1.7, cost: 50, placement: { kind: "beside" } },
  { id: "tiger", name: "호랑이", category: "pet", model: "/models/pets/animal-tiger.glb", thumb: "/thumbs/animal-tiger.png", size: 1.7, cost: 60, placement: { kind: "beside" } },
  { id: "hog", name: "멧돼지", category: "pet", model: "/models/pets/animal-hog.glb", thumb: "/thumbs/animal-hog.png", size: 1.5, cost: 38, placement: { kind: "beside" } },

  // furniture
  { id: "bed", name: "침대", category: "furniture", model: "/models/furniture/bedSingle.glb", thumb: "/thumbs/bedSingle.png", size: 3.4, cost: 12, placement: { kind: "floor", x: -2.9, z: -1.4, ry: 90 } },
  { id: "desk", name: "책상", category: "furniture", model: "/models/furniture/desk.glb", thumb: "/thumbs/desk.png", size: 2.6, cost: 10, placement: { kind: "floor", x: 2.7, z: -1.7, ry: 0 } },
  { id: "chair", name: "의자", category: "furniture", model: "/models/furniture/chairDesk.glb", thumb: "/thumbs/chairDesk.png", size: 1.5, cost: 6, placement: { kind: "floor", x: 2.5, z: -0.5, ry: 180 } },
  { id: "rug", name: "러그", category: "furniture", model: "/models/furniture/rugRounded.glb", thumb: "/thumbs/rugRounded.png", size: 3.2, cost: 9, placement: { kind: "floor", x: 0, z: 0.9, ry: 0 } },
  { id: "bookcase", name: "책장", category: "furniture", model: "/models/furniture/bookcaseOpen.glb", thumb: "/thumbs/bookcaseOpen.png", size: 2.4, cost: 14, placement: { kind: "floor", x: 0.2, z: -2.8, ry: 0 } },
  { id: "sofa", name: "소파", category: "furniture", model: "/models/furniture/loungeSofa.glb", thumb: "/thumbs/loungeSofa.png", size: 2.6, cost: 20, placement: { kind: "floor", x: -3.2, z: 0.9, ry: 60 } },
  { id: "tv", name: "티비장", category: "furniture", model: "/models/furniture/cabinetTelevision.glb", thumb: "/thumbs/cabinetTelevision.png", size: 2.2, cost: 18, placement: { kind: "floor", x: -0.6, z: -2.9, ry: 0 } },
  { id: "lamp", name: "스탠드", category: "furniture", model: "/models/furniture/lampRoundTable.glb", thumb: "/thumbs/lampRoundTable.png", size: 1.0, cost: 7, placement: { kind: "floor", x: 3.4, z: -2.5, ry: 0 } },
  { id: "floorlamp", name: "플로어램프", category: "furniture", model: "/models/furniture/lampSquareFloor.glb", thumb: "/thumbs/lampSquareFloor.png", size: 2.0, cost: 11, placement: { kind: "floor", x: -3.6, z: -2.0, ry: 0 } },
  { id: "fridge", name: "냉장고", category: "furniture", model: "/models/furniture/kitchenFridgeSmall.glb", thumb: "/thumbs/kitchenFridgeSmall.png", size: 1.8, cost: 16, placement: { kind: "floor", x: 3.7, z: -3.0, ry: 0 } },
  { id: "bench", name: "벤치", category: "furniture", model: "/models/furniture/bench.glb", thumb: "/thumbs/bench.png", size: 2.0, cost: 8, placement: { kind: "floor", x: 3.4, z: 1.4, ry: -40 } },
  { id: "pillow", name: "쿠션", category: "furniture", model: "/models/furniture/pillowBlue.glb", thumb: "/thumbs/pillowBlue.png", size: 0.8, cost: 3, placement: { kind: "floor", x: -2.6, z: -0.3, ry: 0 } },
  { id: "books", name: "책", category: "furniture", model: "/models/furniture/books.glb", thumb: "/thumbs/books.png", size: 0.7, cost: 3, placement: { kind: "floor", x: 2.6, z: -1.4, ry: 0 } },
  { id: "laptop", name: "노트북", category: "furniture", model: "/models/furniture/laptop.glb", thumb: "/thumbs/laptop.png", size: 0.7, cost: 13, placement: { kind: "floor", x: 2.9, z: -1.5, ry: 0 } },
  { id: "plant", name: "화분", category: "furniture", model: "/models/furniture/plantSmall1.glb", thumb: "/thumbs/plantSmall1.png", size: 0.9, cost: 5, placement: { kind: "floor", x: -3.8, z: -0.8, ry: 0 } },
  { id: "rug2", name: "네모 러그", category: "furniture", model: "/models/furniture/rugRectangle.glb", thumb: "/thumbs/rugRectangle.png", size: 3.0, cost: 9, placement: { kind: "floor", x: 0, z: 1.1, ry: 0 } },

  // nature
  { id: "flower-red", name: "빨간 꽃", category: "nature", model: "/models/nature/flower_redA.glb", thumb: "/thumbs/flower_redA.png", size: 0.9, cost: 4, placement: { kind: "floor", x: -1.7, z: 1.3, ry: 0 } },
  { id: "flower-yellow", name: "노란 꽃", category: "nature", model: "/models/nature/flower_yellowB.glb", thumb: "/thumbs/flower_yellowB.png", size: 0.9, cost: 4, placement: { kind: "floor", x: 1.7, z: 1.3, ry: 0 } },
  { id: "flower-purple", name: "보라 꽃", category: "nature", model: "/models/nature/flower_purpleA.glb", thumb: "/thumbs/flower_purpleA.png", size: 0.9, cost: 4, placement: { kind: "floor", x: -1.2, z: 1.7, ry: 0 } },
  { id: "cactus", name: "선인장", category: "nature", model: "/models/nature/cactus_short.glb", thumb: "/thumbs/cactus_short.png", size: 1.0, cost: 6, placement: { kind: "floor", x: 3.5, z: 0.5, ry: 0 } },
  { id: "cactus-tall", name: "키큰 선인장", category: "nature", model: "/models/nature/cactus_tall.glb", thumb: "/thumbs/cactus_tall.png", size: 1.5, cost: 9, placement: { kind: "floor", x: 3.9, z: -0.4, ry: 0 } },
  { id: "grass", name: "풀", category: "nature", model: "/models/nature/grass_large.glb", thumb: "/thumbs/grass_large.png", size: 0.8, cost: 2, placement: { kind: "floor", x: -3.5, z: 1.0, ry: 0 } },
  { id: "tree", name: "작은 나무", category: "nature", model: "/models/nature/tree_small.glb", thumb: "/thumbs/tree_small.png", size: 2.4, cost: 15, placement: { kind: "floor", x: -4.0, z: 1.9, ry: 0 } },
  { id: "mushroom", name: "버섯", category: "nature", model: "/models/nature/mushroom_red.glb", thumb: "/thumbs/mushroom_red.png", size: 0.6, cost: 3, placement: { kind: "floor", x: 1.2, z: 1.9, ry: 0 } },
  { id: "stone", name: "돌", category: "nature", model: "/models/nature/stone_smallA.glb", thumb: "/thumbs/stone_smallA.png", size: 0.7, cost: 2, placement: { kind: "floor", x: -0.8, z: 2.0, ry: 0 } },
  { id: "log", name: "통나무", category: "nature", model: "/models/nature/log.glb", thumb: "/thumbs/log.png", size: 1.4, cost: 5, placement: { kind: "floor", x: 4.0, z: 1.9, ry: 20 } },

  // food
  { id: "cake", name: "케이크", category: "food", model: "/models/food/cake.glb", thumb: "/thumbs/cake.png", size: 0.9, cost: 10, placement: { kind: "floor", x: 2.7, z: -1.1, ry: 0 } },
  { id: "donut", name: "도넛", category: "food", model: "/models/food/donut-sprinkles.glb", thumb: "/thumbs/donut-sprinkles.png", size: 0.6, cost: 5, placement: { kind: "floor", x: 2.1, z: -1.0, ry: 0 } },
  { id: "icecream", name: "아이스크림", category: "food", model: "/models/food/ice-cream.glb", thumb: "/thumbs/ice-cream.png", size: 0.7, cost: 6, placement: { kind: "floor", x: 3.2, z: -1.0, ry: 0 } },
  { id: "cookie", name: "쿠키", category: "food", model: "/models/food/cookie-chocolate.glb", thumb: "/thumbs/cookie-chocolate.png", size: 0.5, cost: 3, placement: { kind: "floor", x: 2.3, z: -1.35, ry: 0 } },
  { id: "pizza", name: "피자", category: "food", model: "/models/food/pizza.glb", thumb: "/thumbs/pizza.png", size: 0.9, cost: 9, placement: { kind: "floor", x: 1.6, z: -1.2, ry: 0 } },
  { id: "hotdog", name: "핫도그", category: "food", model: "/models/food/hot-dog.glb", thumb: "/thumbs/hot-dog.png", size: 0.7, cost: 6, placement: { kind: "floor", x: 1.9, z: -1.5, ry: 0 } },
  { id: "pancakes", name: "팬케이크", category: "food", model: "/models/food/pancakes.glb", thumb: "/thumbs/pancakes.png", size: 0.7, cost: 7, placement: { kind: "floor", x: 3.4, z: -1.4, ry: 0 } },
  { id: "strawberry", name: "딸기", category: "food", model: "/models/food/strawberry.glb", thumb: "/thumbs/strawberry.png", size: 0.4, cost: 2, placement: { kind: "floor", x: 2.4, z: -0.9, ry: 0 } },
  { id: "watermelon", name: "수박", category: "food", model: "/models/food/watermelon.glb", thumb: "/thumbs/watermelon.png", size: 0.9, cost: 8, placement: { kind: "floor", x: 3.6, z: -0.7, ry: 0 } },
  { id: "popsicle", name: "아이스바", category: "food", model: "/models/food/popsicle.glb", thumb: "/thumbs/popsicle.png", size: 0.6, cost: 4, placement: { kind: "floor", x: 1.4, z: -0.9, ry: 0 } },

  // vehicle
  { id: "racer", name: "경주차", category: "vehicle", model: "/models/vehicle/vehicle-racer.glb", thumb: "/thumbs/vehicle-racer.png", size: 1.8, cost: 22, placement: { kind: "floor", x: -3.2, z: 1.9, ry: 30 } },
  { id: "suv", name: "승합차", category: "vehicle", model: "/models/vehicle/vehicle-suv.glb", thumb: "/thumbs/vehicle-suv.png", size: 1.9, cost: 18, placement: { kind: "floor", x: -2.2, z: 2.2, ry: 20 } },
  { id: "monster", name: "몬스터트럭", category: "vehicle", model: "/models/vehicle/vehicle-monster-truck.glb", thumb: "/thumbs/vehicle-monster-truck.png", size: 2.0, cost: 40, placement: { kind: "floor", x: -1.2, z: 2.4, ry: 10 } },
  { id: "truck", name: "트럭", category: "vehicle", model: "/models/vehicle/vehicle-truck.glb", thumb: "/thumbs/vehicle-truck.png", size: 2.1, cost: 30, placement: { kind: "floor", x: -4.0, z: 1.2, ry: 45 } },
  { id: "speedster", name: "스피드스터", category: "vehicle", model: "/models/vehicle/vehicle-speedster.glb", thumb: "/thumbs/vehicle-speedster.png", size: 1.8, cost: 26, placement: { kind: "floor", x: -0.2, z: 2.5, ry: 0 } },
  { id: "vintage", name: "클래식카", category: "vehicle", model: "/models/vehicle/vehicle-vintage-racer.glb", thumb: "/thumbs/vehicle-vintage-racer.png", size: 1.8, cost: 34, placement: { kind: "floor", x: 0.8, z: 2.4, ry: -15 } },
];


/** 처음 가입한 아이가 그냥 갖고 시작하는 것 — 값이 0 인 아이템 */
export const FREE_ITEMS = CATALOG.filter((i) => i.cost === 0).map((i) => i.id);
export const DEFAULT_CHARACTER = "char-fb";

export const byCategory = (c: Category) => CATALOG.filter((i) => i.category === c);
export const findItem = (id: string) => CATALOG.find((i) => i.id === id) ?? null;
export const characters = CATALOG.filter((i) => i.category === "character");
