import "dotenv/config";
import { randomBytes } from "node:crypto";
import { verifyDbUrl } from "./verify_db.mjs";
// 🔴 앱의 DB 를 쓰지 않는다 (D64). @/db 는 불러올 때 읽으므로 미리 바꾼다
process.env.DATABASE_URL = verifyDbUrl();

import { readFileSync } from "node:fs";

/**
 * 주석을 뺀 소스. 🔴 있어서는 안 되는 것을 찾는 검사는 이쪽을 쓴다 —
 *    주석이 그 패턴을 인용하면 검사가 속는다 (`verify_logic` 에서 겪었다).
 */
const code = (rel: string) =>
  readFileSync(new URL(`../src/${rel}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

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

  /**
   * 🔴 **해제된 기기가 갇히지 않아야 한다** (어긋남 대장 D68).
   *
   *    해제는 부모 브라우저에서 일어나고 서버는 **다른 기기의 쿠키를 못 지운다.**
   *    그래서 모드 쿠키가 남아 「나는 아이 기기」라고 말하면 —
   *    부모 화면은 미들웨어가 막고 아이 화면은 토큰이 죽어서 안 열린다.
   *    **어느 쪽으로도 못 나간다.** 실기기에서 그렇게 나왔다.
   *
   *    아이 레이아웃이 그 상태를 알아보고 `/child/left` 로 보내며,
   *    그 Route Handler 가 쿠키 셋을 지운다. 화면(RSC)은 쿠키를 못 지우므로
   *    **Route Handler 여야 한다** — 그 사실을 검사로 못박는다.
   */
  const layout = code("app/child/layout.tsx");
  check("🔴 해제된 기기를 스스로 풀어 준다", /redirect\("\/child\/left"\)/.test(layout),
    "안 풀면 부모 화면도 아이 화면도 못 여는 상태로 갇힌다");
  check("  모드가 아이일 때만 푼다", /readMode\([\s\S]{0,80}?\) === "CHILD"/.test(layout),
    "모드 쿠키가 없는 사람은 그냥 방문자다 — 아무 것도 지우지 않는다");
  check("  🔴 동의 철회는 풀지 않는다", /reason !== "CONSENT_REQUIRED"/.test(layout),
    "재동의하면 바로 이어져야 한다 — 토큰을 지우면 기기를 다시 등록해야 한다");

  const left = code("app/child/left/route.ts");

  /**
   * 🔴 **「어떻게」가 아니라 「무엇을」 본다.**
   *
   *    처음엔 `child/left` 안에 `DEVICE_COOKIE, MODE_COOKIE, UNLOCK_COOKIE` 가
   *    적혀 있는지 봤다. 그 줄이 `forgetSession` 헬퍼로 옮겨지자 **검사가 깨졌다** —
   *    동작은 오히려 나아졌는데(보호자 쿠키까지 지운다) 검사가 낡은 «형태»를 보고 있었다.
   *    오늘 같은 종류를 여러 번 겪었다(주석 · import 줄 · 좀비 서버).
   *
   *    그래서 **지우는 쪽 파일에서 이름 목록을 확인**하고,
   *    `child/left` 는 **그것을 부르는지**만 본다. 어디로 옮기든 따라간다.
   */
  const forget = code("lib/session/forget.ts");
  for (const name of ["DEVICE_COOKIE", "MODE_COOKIE", "UNLOCK_COOKIE"]) {
    check(`🔴 ${name} 를 지운다`, new RegExp(`\\b${name}\\b`).test(forget),
      "하나라도 남으면 갇힌 상태가 이어진다");
  }
  check("  실제로 지우는 호출이 있다", /cookies\.delete\(/.test(forget));
  check("  아이 기기가 그것을 부른다", /forgetSession\(/.test(left),
    "부르지 않으면 쿠키가 남아 갇힌다");
  check("  Route Handler 다", /export async function GET/.test(left),
    "화면(RSC)은 쿠키를 지울 수 없다");

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
