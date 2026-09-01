/**
 * 아이 화면 링크만 발급한다 — 🔴 **아무 데이터도 만들거나 지우지 않는다.**
 *
 * `seed-missions.mjs` 는 시드 데이터를 깐다. 실제 계정으로 확인할 때는 이걸 쓴다 —
 * 남의 계정에 내 시드가 섞이면 「이 미션 누가 만들었지」가 된다. 실제로 그랬다.
 *
 * 사용: node prisma/issue-link.mjs [아이이름] [포트]
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
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

const token = randomBytes(32).toString("base64url");
await prisma.deviceSession.create({
  data: { guardianId: c.guardianId, childId: c.id, deviceRef: randomBytes(12).toString("hex"),
          mode: "CHILD", tokenHash: h(token), expiresAt: new Date(Date.now() + 180 * 864e5) },
});

console.log(`  아이  ${c.displayName}  (${c.id})`);
if (!g?.consentCompleted) console.log("  ⚠ 보호자 동의가 없어 아이 화면이 「동의가 필요해요」로 막힌다");
console.log("\n  이 주소를 브라우저에 붙여넣으면 됩니다:");
console.log(`  http://localhost:${port}/child/enter?t=${token}`);
await prisma.$disconnect();
