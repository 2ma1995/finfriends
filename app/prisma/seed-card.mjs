/**
 * 카드 거래 **예시** 데이터 — 어긋남 대장 D19. 🔴 로컬 전용.
 *
 * 실제 연동(`DAT-004`)이 붙기 전까지 「카드에서 내역이 들어온다」를 손으로 만든다.
 * 전부 `source = MOCK` 이라 화면이 「예시」라고 밝힌다.
 *
 * 사용: node prisma/seed-card.mjs [아이이름]
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const day = (n) => new Date(Date.now() - n * 864e5);

const want = process.argv[2];
const kids = await prisma.childAccount.findMany({
  select: { id: true, displayName: true }, orderBy: { createdAt: "asc" },
});
if (kids.length === 0) { console.error("아이가 없다. 먼저 seed.mjs 를 돌린다."); process.exit(1); }
const c = (want && kids.find((k) => k.displayName === want)) || kids[0];

// 아직 안 맞춰본 것만 지운다 — 이미 계획에 붙인 것은 그대로 둔다
await prisma.cardTransaction.deleteMany({ where: { childId: c.id, recordId: null } });

// 🔴 **계획과 일부러 어긋나게 둔다.** 딱 맞으면 대조할 게 없다 —
//    「3,000원이라고 적었는데 4,500원이네」가 이 기능의 목적이다
await prisma.cardTransaction.createMany({ data: [
  { childId: c.id, amount: 4500, merchant: "다이소 성수점",  category: "STATIONERY", occurredAt: day(0) },
  { childId: c.id, amount: 2800, merchant: "편의점",         category: "SNACK",      occurredAt: day(0) },
  { childId: c.id, amount: 12000, merchant: "동네 서점",      category: "BOOK",       occurredAt: day(1) },
  { childId: c.id, amount: 1500, merchant: "학교 앞 문구점",  category: "STATIONERY", occurredAt: day(2) },
  { childId: c.id, amount: 6000, merchant: "베이커리",       category: "SNACK",      occurredAt: day(3) },
] });

console.log("  아이       ", c.displayName);
console.log("  카드 내역  ", await prisma.cardTransaction.count({ where: { childId: c.id, recordId: null } }), "건 (예시 · source=MOCK)");
console.log("  → /child/plan 에서 계획에 맞춰볼 수 있다");
await prisma.$disconnect();
