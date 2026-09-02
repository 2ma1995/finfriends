import "dotenv/config";
import { randomBytes } from "node:crypto";
import { verifyDbUrl } from "./verify_db.mjs";
// 🔴 앱의 DB 를 쓰지 않는다 (D64). @/db 는 불러올 때 읽으므로 미리 바꾼다
process.env.DATABASE_URL = verifyDbUrl();

let failed = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`);
  if (!ok) failed += 1;
};

async function main() {
  console.log("기기 해제 → 재등록 — 아이 화면이 이상할 때 부모가 되돌릴 수 있는가\n");
  const { prisma } = await import("@/db");
  const { createGuardian } = await import("@/lib/session/guardian-session");
  const { completeConsent, createChildProfile } = await import("@/modules/consent");
  const { issueInvite, consumeInvite } = await import("@/lib/session/child-invite");
  const { verifyChildAccess, revokeDevice } = await import("@/lib/session/device-session");
  const { REQUIRED_KEYS } = await import("@/contracts/consent");
  const { topUp } = await import("@/modules/allowance");

  const email = `verify-rereg-${randomBytes(4).toString("hex")}@example.test`;
  const g = await createGuardian(email, randomBytes(12).toString("base64url"));
  if (!g.ok) return console.log("가입 실패");
  await completeConsent(g.guardianId, REQUIRED_KEYS);
  const c = await createChildProfile(g.guardianId, { displayName: "수빈", birthYear: 2017, deviceType: "SHARED" });
  if (!c.ok) return console.log("아이 실패", JSON.stringify(c));

  // 기록을 남긴다 — 재등록해도 살아 있어야 한다
  await topUp(c.childId, 30000, "", `rereg:${randomBytes(4).toString("hex")}`);
  const before = await prisma.allowanceEntry.count({ where: { childId: c.childId } });

  const inv1 = await issueInvite(g.guardianId, c.childId);
  const r1 = await consumeInvite(inv1.token);
  if (!r1.ok) return console.log("첫 등록 실패", JSON.stringify(r1));
  const a1 = await verifyChildAccess(r1.token);
  check("첫 등록 뒤 아이 화면이 열린다", a1.ok, a1.ok ? "" : `막혔다 (${a1.reason})`);

  const dev = await prisma.deviceSession.findFirst({
    where: { guardianId: g.guardianId, mode: "CHILD", revokedAt: null }, select: { deviceRef: true },
  });
  await revokeDevice(g.guardianId, dev!.deviceRef);
  const a2 = await verifyChildAccess(r1.token);
  check("🔴 해제하면 바로 막힌다", !a2.ok && a2.reason === "REVOKED",
    "쿠키가 남아 있어도 다음 진입에서 막혀야 한다 (D5-b)");

  // 🔴 옛 링크를 다시 써 보기 — 1회용이라 안 되어야 한다
  const again = await consumeInvite(inv1.token);
  check("🔴 옛 링크를 다시 쓸 수 없다", !again.ok && again.reason === "USED",
    "1회용이 아니면 돌아다니는 링크로 아무 기기나 등록된다");

  const inv2 = await issueInvite(g.guardianId, c.childId);
  const r2 = await consumeInvite(inv2.token);
  check("새 링크로 다시 등록된다", r2.ok, r2.ok ? "" : `안 됐다 (${r2.reason})`);
  if (r2.ok) {
    const a3 = await verifyChildAccess(r2.token);
    check("  재등록 뒤 아이 화면이 열린다", a3.ok, a3.ok ? "" : `막혔다 (${a3.reason})`);
  }

  const after = await prisma.allowanceEntry.count({ where: { childId: c.childId } });
  check("🔴 기록이 그대로 이어진다", before === after && before > 0,
    `해제 전 ${before}줄 → 재등록 후 ${after}줄. 기록은 아이에게 붙어 있고 기기에 붙어 있지 않다`);

  const live = await prisma.deviceSession.count({ where: { guardianId: g.guardianId, mode: "CHILD", revokedAt: null } });
  check("해제된 기기가 살아 남지 않는다", live === 1, `살아 있는 기기 ${live}개 — 새 것 하나여야 한다`);

  // 🔴 뒷정리 — 시험 데이터를 남기지 않는다
  const { withdrawAccount } = await import("@/modules/account");
  await withdrawAccount(g.guardianId);
}

main()
  .catch((e) => { console.error(e); failed += 1; })
  .finally(() => {
    console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
    process.exit(failed === 0 ? 0 : 1);
  });
