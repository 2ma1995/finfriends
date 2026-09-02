/**
 * 카드 거래 **예시** 데이터 — 어긋남 대장 D19. 🔴 로컬 전용.
 *
 * 실제 연동(`DAT-004`)이 붙기 전까지 「카드에서 내역이 들어온다」를 손으로 만든다.
 * 전부 `source = MOCK` 이라 화면이 「예시」라고 밝힌다.
 *
 * 사용: node prisma/seed-card.mjs [아이이름]
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * 🔴 **어느 DB 를 보는지 첫 줄에 찍는다** (어긋남 대장 D64).
 *
 * 이 파일들은 `process.env.DATABASE_URL ?? "localhost:55432"` 였다.
 * `.mjs` 는 `dotenv` 를 스스로 안 읽으므로 **그 값이 늘 비어 있었고**,
 * `.env` 가 Supabase 를 가리키게 바뀐 뒤에도 **조용히 로컬 도커를 봤다.**
 *
 * 앱은 Supabase 를 보는데 도구는 로컬을 보고 있었다 — 「아이 목록」이 다르게 나와도
 * **아무도 이유를 몰랐다.** 조용한 기본값이 원인이다.
 */
function dbUrl() {
  const u = process.env.DATABASE_URL;
  if (!u) {
    console.error("🔴 DATABASE_URL 이 없다. app/.env 를 채운다 — 조용히 로컬로 떨어지지 않는다");
    process.exit(1);
  }
  console.log(`  (대상 DB: ${new URL(u).hostname})`);
  return u;
}


const url = dbUrl();
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
// 🔴 **실제 카드가 보내는 값은 MCC 다** (ISO 18245). `category` 는 접은 결과이므로
//    여기서는 비워 두고 코드가 접게 한다 — 웹훅이 붙어도 바꿀 게 없다.
// 🔴 **다이소는 일부러 `5331`(잡화점)** 로 둔다. 한국은 포괄 코드가 흔하고,
//    그런 결제가 미분류 봉투로 가는 것을 시연에서 보여야 한다.
await prisma.cardTransaction.createMany({ data: [
  { childId: c.id, amount: 4500,  merchant: "다이소 성수점",  mcc: "5331", category: "STATIONERY", occurredAt: day(0) },
  { childId: c.id, amount: 2800,  merchant: "편의점",         mcc: "5499", category: "SNACK",      occurredAt: day(0) },
  { childId: c.id, amount: 12000, merchant: "동네 서점",      mcc: "5942", category: "BOOK",       occurredAt: day(1) },
  { childId: c.id, amount: 1500,  merchant: "학교 앞 문구점",  mcc: "5943", category: "STATIONERY", occurredAt: day(2) },
  { childId: c.id, amount: 6000,  merchant: "베이커리",       mcc: "5462", category: "SNACK",      occurredAt: day(3) },
  { childId: c.id, amount: 3000,  merchant: "문방구 옆 가게",  mcc: "5999", category: "STATIONERY", occurredAt: day(4) },
] });

console.log("  아이       ", c.displayName);
console.log("  카드 내역  ", await prisma.cardTransaction.count({ where: { childId: c.id, recordId: null } }), "건 (예시 · source=MOCK)");
console.log("  → 내 통장 「봉투」에서 맞춰볼 수 있다");
await prisma.$disconnect();
