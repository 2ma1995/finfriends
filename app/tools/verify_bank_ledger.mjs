/**
 * 아이 통장이 용돈 원장 위에 있는가 — D18 · D21 · D22 · 🔴 로컬 전용
 *
 * 확인하는 것 — **부모가 넣은 돈이 아이가 보는 잔액과 같은가.**
 * 한동안 부모 화면은 `guardian_accounts.mock_balance_won` 을, 아이 화면은
 * `activity.allowance_ledger` 를 봐서 60,000원과 20,000원이 따로 떠 있었다.
 *
 * 🔴 `modules/bank` · `modules/allowance` 의 규칙을 다시 밟는다. 고치면 여기도 같이 고친다.
 *
 *   node tools/verify_bank_ledger.mjs
 */
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { verifyDbUrl } from "./verify_db.mjs";

// 🔴 대상을 여기서 정하지 않는다 — 조용히 딴 DB 로 떨어지지 않게 한 곳에 모았다 (D64)
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: verifyDbUrl() }) });

/** contracts/bank.TOPUP_AMOUNTS */
const TOPUP_AMOUNTS = [5000, 10000, 30000];

let failed = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`); if (!ok) failed++; };
const balance = async (childId) =>
  (await prisma.allowanceEntry.aggregate({ where: { childId }, _sum: { delta: true } }))._sum.delta ?? 0;

/** modules/allowance.getWalletTotals — 쓸 수 있는 돈 · 목표에 묶인 돈 · 가진 돈 전체 */
async function wallet(childId) {
  const [free, saved] = await Promise.all([
    balance(childId),
    prisma.wishlist.aggregate({ where: { childId }, _sum: { savedAmount: true } }),
  ]);
  const setAside = saved._sum.savedAmount ?? 0;
  return { free, setAside, total: free + setAside };
}

/** modules/allowance.record — 합이 잔액이고, 0 밑으로 내려가지 않는다 */
async function record(childId, delta, code, memo, key) {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.allowanceEntry.aggregate({ where: { childId }, _sum: { delta: true } });
    const bal = agg._sum.delta ?? 0;
    const next = bal + Math.floor(delta);
    if (next < 0) return { ok: false, reason: "NOT_ENOUGH" };
    try {
      await tx.allowanceEntry.create({ data: { childId, delta: Math.floor(delta), code, memo, idempotencyKey: key, balanceAfter: next } });
      return { ok: true, balance: next, duplicated: false };
    } catch (e) {
      if (e.code === "P2002") return { ok: true, balance: bal, duplicated: true };
      throw e;
    }
  });
}

console.log("아이 통장 — 부모가 넣은 돈이 아이에게 보이는가\n");

let user;
try {
  // 🔴 컬럼이 사라졌는가 — 남아 있으면 언제든 다시 갈린다
  const col = await prisma.$queryRaw`
    select column_name from information_schema.columns
    where table_schema = 'identity' and table_name = 'guardian_accounts'
      and column_name = 'mock_balance_won'`;
  check("🔴 identity 에 잔액 컬럼이 없다", col.length === 0, "금액은 activity 에만 둔다 (REQ-NF-009)");

  const kept = await prisma.$queryRaw`
    select column_name from information_schema.columns
    where table_schema = 'identity' and table_name = 'guardian_accounts'
      and column_name in ('savings_interest_pct', 'mock_card_status')`;
  check("이자율·카드 상태는 남아 있다", kept.length === 2, "아이 화면이 읽어 쓴다");

  user = await prisma.devAuthUser.create({ data: { email: `bank-${randomBytes(4).toString("hex")}@example.test`, passwordHash: "x:y" } });
  const g = await prisma.guardianAccount.create({ data: { authRef: user.id, consentCompleted: true, consentAt: new Date() } });
  const c = await prisma.childAccount.create({ data: { guardianId: g.id, displayName: "통장", birthYear: 2017, deviceType: "SHARED", state: "ACTIVE" } });

  check("아이가 없으면 잔액은 0", (await balance(c.id)) === 0);

  // 부모가 버튼을 누른다 — modules/bank.topUpAllowance
  await record(c.id, 10000, "TOPUP", "", `topup:${randomUUID()}`);
  await record(c.id, 5000, "TOPUP", "", `topup:${randomUUID()}`);
  check("충전이 원장에 쌓인다", (await balance(c.id)) === 15000, "10,000 + 5,000");

  const rows = await prisma.allowanceEntry.count({ where: { childId: c.id } });
  check("누를 때마다 새 줄이다", rows === 2, "같은 금액을 여러 번 줄 수 있다");

  // 🔴 부모 화면과 아이 화면이 같은 수를 본다
  const parentSees = await balance(c.id);
  const childSees = await balance(c.id);
  check("🔴 부모 화면과 아이 화면의 잔액이 같다", parentSees === childSees && parentSees === 15000);

  // 정해진 금액만 — contracts/bank.TOPUP_AMOUNTS
  check("정해진 금액만 받는다", !TOPUP_AMOUNTS.includes(7000) && TOPUP_AMOUNTS.includes(30000), "입력란을 두면 실제 이체처럼 읽힌다");

  // 중복은 정상 경로다 (규칙 ④)
  const key = `topup:${randomUUID()}`;
  await record(c.id, 5000, "TOPUP", "", key);
  const again = await record(c.id, 5000, "TOPUP", "", key);
  check("같은 키가 두 번 와도 한 줄", again.ok && again.duplicated === true && (await balance(c.id)) === 20000);

  // 아이가 목표에 넣는다 — 🔴 쓴 게 아니라 묶인 것이다
  await prisma.wishlist.create({ data: { childId: c.id, name: "물감 세트", targetAmount: 30000, savedAmount: 15000, rank: 1 } });
  await record(c.id, -15000, "WISH_SET_ASIDE", "목표에 넣었어요", `wish:${randomUUID()}`);
  check("목표에 넣으면 쓸 수 있는 돈이 준다", (await balance(c.id)) === 5000, "같은 원장이다");

  /**
   * 🔴 **「잔액」이 한 숫자가 아니다.** 원장 합만 보여주면 목표에 묶인 돈이
   *    사라진 것처럼 보인다 — 20,000원을 준 뒤 화면에 5,000원만 뜬다.
   *    세는 곳은 `modules/allowance.getWalletTotals` 하나여야 한다.
   */
  const totals = await wallet(c.id);
  check("쓸 수 있는 돈 = 원장 합", totals.free === 5000);
  check("목표에 넣어 둔 돈이 따로 잡힌다", totals.setAside === 15000, "🔴 쓴 게 아니라 묶인 것이다");
  check("🔴 가진 돈 전체는 줄지 않았다", totals.total === 20000, "부모가 준 20,000원 그대로");

  // 🔴 0 밑으로 내려가지 않는다 (규칙 ③)
  const over = await record(c.id, -9999999, "PLAN_SPEND", "너무 큼", `over:${randomUUID()}`);
  check("🔴 잔액이 0 밑으로 내려가지 않는다", !over.ok && over.reason === "NOT_ENOUGH");
  check("막힌 시도는 줄을 남기지 않는다", (await balance(c.id)) === 5000);

  // 되돌리기 — 🔴 줄을 지우지 않고 상쇄하는 줄을 적는다
  const target = await prisma.allowanceEntry.findFirst({ where: { childId: c.id, code: "TOPUP", delta: 10000 }, select: { id: true, delta: true } });
  const beforeRows = await prisma.allowanceEntry.count({ where: { childId: c.id } });
  const bal = await balance(c.id);
  const want = -target.delta;
  const applied = want < 0 ? -Math.min(bal, -want) : want;
  await record(c.id, applied, "ADJUST", "부모님이 고쳤어요 — 잘못 줌", `adjust:${target.id}`);

  check("되돌려도 원래 줄은 남는다", (await prisma.allowanceEntry.findUnique({ where: { id: target.id } })) !== null, "🔴 지우면 왜 이렇게 됐는지 아무도 못 본다");
  check("되돌리면 줄이 하나 늘어난다", (await prisma.allowanceEntry.count({ where: { childId: c.id } })) === beforeRows + 1);
  check("🔴 되돌릴 수 있는 만큼만 되돌린다", Math.abs(applied) === 5000 && (await balance(c.id)) === 0, "10,000 중 5,000 만 — 나머지는 아이가 이미 썼다");
  check("🔴 못 되돌린 금액을 말할 수 있다", Math.abs(want) - Math.abs(applied) === 5000, "조용히 넘기면 보호자는 다 취소된 줄 안다");

  /**
   * 같은 줄을 두 번 되돌릴 수 없다 — `reverseEntry` 는 **잔액을 보기 전에**
   * `adjust:<줄 id>` 키가 이미 있는지로 막는다. 잔액으로 막으면 잔액이 다시 찼을 때
   * 같은 줄을 또 되돌릴 수 있게 된다.
   */
  const already = await prisma.allowanceEntry.findUnique({ where: { idempotencyKey: `adjust:${target.id}` }, select: { id: true } });
  check("🔴 같은 줄을 두 번 되돌릴 수 없다", already !== null, "잔액이 아니라 되돌림 표시로 막는다");

  // 🔴 별과 섞이지 않는다 (P-21 · REQ-NF-010 · S4)
  const stars = await prisma.starLedgerEntry.count({ where: { childId: c.id } });
  check("🔴 용돈이 별을 만들지 않는다", stars === 0, "별↔저금통 전환 경로 0건");

  await prisma.allowanceEntry.deleteMany({ where: { childId: c.id } });
  await prisma.wishlist.deleteMany({ where: { childId: c.id } });
  await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
  await prisma.guardianAccount.delete({ where: { id: g.id } });
  await prisma.devAuthUser.delete({ where: { id: user.id } });
  check("정리 완료", true);
} catch (e) {
  console.error("\n예외:", e.message); failed++;
  if (user) {
    const g = await prisma.guardianAccount.findUnique({ where: { authRef: user.id } });
    if (g) {
      const kids = await prisma.childAccount.findMany({ where: { guardianId: g.id }, select: { id: true } });
      await prisma.allowanceEntry.deleteMany({ where: { childId: { in: kids.map(k => k.id) } } });
      await prisma.wishlist.deleteMany({ where: { childId: { in: kids.map(k => k.id) } } });
      await prisma.childAccount.deleteMany({ where: { guardianId: g.id } });
      await prisma.guardianAccount.delete({ where: { id: g.id } });
    }
    await prisma.devAuthUser.deleteMany({ where: { id: user.id } });
  }
}
await prisma.$disconnect();
console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
