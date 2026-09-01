/**
 * 별은 나갔는데 실천 기록이 없는 저금 건을 메운다 — 어긋남 대장 D53.
 *
 * 🔴 **없던 상을 새로 주는 것이 아니다.** `grantStar` 와 `practiceCredit` 은
 *    **함께 쓰여야 하는 한 쌍**인데(별 원장의 `practice_id` 가 그 둘을 잇는다),
 *    저금 경로만 별을 주고 실천을 안 남겼다. 그 반쪽을 채운다.
 *
 * 🔴 **대상은 `practice_id` 가 비어 있는 저금 별뿐**이다. 이미 이어진 것은 건드리지 않는다.
 * 🔴 **별을 새로 주지 않는다.** 별 개수는 그대로다 — 잇기만 한다.
 *
 * 사용: node prisma/backfill-savings-practice.mjs [--write]
 *       인자가 없으면 **무엇이 바뀔지만 보여준다.**
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:ff@localhost:55432/finfriends" }) });
const write = process.argv.includes("--write");
const cycleOf = (d) => d.getFullYear() * 100 + (d.getMonth() + 1);

const rows = await prisma.starLedgerEntry.findMany({
  where: { practiceId: null, triggerCode: { in: ["SAVINGS_JOINED", "SAVINGS_DONE"] } },
  select: { id: true, childId: true, triggerCode: true, createdAt: true },
  orderBy: { createdAt: "asc" },
});
const names = new Map((await prisma.childAccount.findMany({ select: { id: true, displayName: true } })).map(c => [c.id, c.displayName]));

console.log(`${write ? "메운다" : "미리 보기 (바꾸지 않는다)"} — 실천 기록이 없는 저금 별 ${rows.length}건\n`);
for (const r of rows) {
  console.log(`  ${(names.get(r.childId) ?? "?").padEnd(7)} ${r.triggerCode.padEnd(15)} ${r.createdAt.toISOString().slice(0,16)}  → 불리기 실천 +1`);
  if (!write) continue;
  await prisma.$transaction(async (tx) => {
    const credit = await tx.practiceCredit.create({
      data: {
        childId: r.childId, triggerCode: r.triggerCode, triggerPath: "PRACTICE",
        topic: "GROW", approvalMode: "guardian",
        // 🔴 **별을 받은 그 시점**에 귀속한다. 지금 날짜로 넣으면 지난 달 실천이 이번 달로 옮겨온다
        earnedAt: r.createdAt, awardedAt: r.createdAt, cycleId: cycleOf(r.createdAt),
      },
      select: { id: true },
    });
    await tx.starLedgerEntry.update({ where: { id: r.id }, data: { practiceId: credit.id } });
  });
}
const after = await prisma.practiceCredit.groupBy({ by: ["childId"], where: { topic: "GROW" }, _count: { _all: true } });
console.log(`\n  ${write ? "메운 뒤" : "지금"} 불리기 실천: ` + (after.length ? after.map(a => `${names.get(a.childId)} ${a._count._all}건`).join(" · ") : "0건"));
if (!write) console.log("\n  실제로 메우려면 --write 를 붙인다");
await prisma.$disconnect();
