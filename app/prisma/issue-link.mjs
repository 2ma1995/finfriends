/**
 * 아이 화면 링크만 발급한다 — 🔴 **아무 데이터도 만들거나 지우지 않는다.**
 *
 * `seed-missions.mjs` 는 시드 데이터를 깐다. 실제 계정으로 확인할 때는 이걸 쓴다 —
 * 남의 계정에 내 시드가 섞이면 「이 미션 누가 만들었지」가 된다. 실제로 그랬다.
 *
 * 사용: node prisma/issue-link.mjs [아이이름] [포트]
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
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
const h = (t) => createHash("sha256").update(t).digest("hex");

const want = process.argv[2];
const port = process.argv[3] ?? "4600";

const kids = await prisma.childAccount.findMany({
  select: { id: true, guardianId: true, displayName: true },
  orderBy: { createdAt: "asc" },
});
if (kids.length === 0) { console.error("아이가 없다."); process.exit(1); }

if (!want) {
  console.log("  아이 목록:");
  for (const k of kids) console.log(`    ${k.displayName}  (${k.id})`);
  console.log("\n  이름을 넣어 다시 실행: node prisma/issue-link.mjs <이름>");
  await prisma.$disconnect(); process.exit(0);
}

const c = kids.find((k) => k.displayName === want);
if (!c) { console.error(`「${want}」 없음. 있는 이름: ${kids.map((k) => k.displayName).join(" · ")}`); process.exit(1); }

const g = await prisma.guardianAccount.findUnique({
  where: { id: c.guardianId }, select: { consentCompleted: true },
});

// 🔴 **24시간 · 1회용 초대 코드**다 (FR-002). 기기 토큰은 링크를 열 때 발급된다.
//    한 번 쓰면 죽으므로 확인할 때마다 이 스크립트를 다시 돌린다.
//    새로 만들면 **앞의 링크는 죽는다** — 여러 장이 돌아다니면 어느 게 유효한지 모른다
const token = randomBytes(32).toString("base64url");
await prisma.childInvite.updateMany({
  where: { guardianId: c.guardianId, childId: c.id, usedAt: null },
  data: { usedAt: new Date() },
});
await prisma.childInvite.create({
  data: { guardianId: c.guardianId, childId: c.id,
          tokenHash: h(token), expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
});

console.log(`  아이  ${c.displayName}  (${c.id})`);
if (!g?.consentCompleted) console.log("  ⚠ 보호자 동의가 없어 아이 화면이 「동의가 필요해요」로 막힌다");
console.log("\n  이 주소를 브라우저에 붙여넣으면 됩니다 (24시간 · 한 번만 열립니다):");
console.log(`  http://localhost:${port}/child/enter?t=${token}`);
await prisma.$disconnect();
