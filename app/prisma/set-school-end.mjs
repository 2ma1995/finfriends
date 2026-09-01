/**
 * 하교 시각을 정한다 — 🔴 **부모 화면이 붙기 전까지 쓰는 임시 통로다.**
 *
 * 원래 이 값은 보호자 화면에서 넣는다(`setSchoolEndAction`). 그 화면이 붙기 전에도
 * 아이 화면을 확인할 수 있어야 해서 둔 것이고, **이 한 값 말고는 아무것도 건드리지 않는다.**
 *
 * 사용: node prisma/set-school-end.mjs [아이이름] [HH:MM]
 *       node prisma/set-school-end.mjs 서연 15:00
 *       node prisma/set-school-end.mjs 서연 --clear    ← 정한 것을 지운다
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const want = process.argv[2];
const clock = process.argv[3];

const kids = await prisma.childAccount.findMany({
  select: { id: true, guardianId: true, displayName: true },
  orderBy: { createdAt: "asc" },
});
if (kids.length === 0) { console.error("아이가 없다."); process.exit(1); }

if (!want || !clock) {
  console.log("  아이 목록:");
  for (const k of kids) {
    const s = await prisma.childSchedule.findUnique({ where: { childId: k.id } });
    const now = s ? `${String(Math.floor(s.schoolEndMin / 60)).padStart(2, "0")}:${String(s.schoolEndMin % 60).padStart(2, "0")}` : "안 정함";
    console.log(`    ${k.displayName}  하교 ${now}`);
  }
  console.log("\n  사용: node prisma/set-school-end.mjs <이름> <HH:MM|--clear>");
  await prisma.$disconnect(); process.exit(0);
}

const kid = kids.find((k) => k.displayName === want);
if (!kid) { console.error(`「${want}」 없다.`); process.exit(1); }

if (clock === "--clear") {
  await prisma.childSchedule.deleteMany({ where: { childId: kid.id } });
  console.log(`  ${kid.displayName} — 하교 시각을 지웠다. 이제 안 묻는다.`);
  await prisma.$disconnect(); process.exit(0);
}

const m = /^(\d{1,2}):(\d{2})$/.exec(clock);
if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) { console.error("시각은 HH:MM 이다."); process.exit(1); }
const minutes = Number(m[1]) * 60 + Number(m[2]);

await prisma.childSchedule.upsert({
  where: { childId: kid.id },
  create: { childId: kid.id, guardianId: kid.guardianId, schoolEndMin: minutes },
  // 🔴 바꾸면 「오늘 물었다」를 지운다 — 안 그러면 고친 그날은 영영 안 묻는다
  update: { schoolEndMin: minutes, askedDay: null },
});

const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
const nowMin = nowKst.getUTCHours() * 60 + nowKst.getUTCMinutes();
console.log(`  ${kid.displayName} — 하교 ${clock} 로 정했다.`);
console.log(`  지금 KST ${String(nowKst.getUTCHours()).padStart(2, "0")}:${String(nowKst.getUTCMinutes()).padStart(2, "0")} — ` +
  (nowMin >= minutes ? "지났다. 오늘 계획 카드가 없으면 아이 홈에서 바로 묻는다." : "아직 안 됐다. 지금 확인하려면 더 이른 시각을 넣어라."));
await prisma.$disconnect();
