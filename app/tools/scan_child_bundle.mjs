/**
 * 오리진 분리 게이트 — FR-003 · AC-003-2 · 어긋남 대장 D38.
 *
 * 확인하는 것 — **아이 화면에 부모 기능이 섞여 들어갔는가.**
 *
 * 🔴 아이가 자기 미션을 스스로 승인할 수 있으면 보호자 승인이라는 절차가 무의미해진다
 *    (`PRC-001`). 화면에서 링크를 지우는 것으로는 부족하다 — 주소를 직접 치면 열린다.
 *
 * 🔴 **단일 앱이라 진짜 오리진 격리는 아니다.** `CON-01`(Next 단일 풀스택)이 도메인을
 *    가르는 것을 막는다. 그래서 문서가 요구하는 검증(`AC-003-2` — 아이 번들에
 *    부모 엔드포인트 문자열 0건)을 **빌드 게이트로** 대신한다.
 *    주소를 직접 치는 것은 미들웨어와 각 Server Action 의 인가가 이미 막는다 — 이건 세 번째 겹이다.
 *
 * 두 겹으로 본다.
 *   ① 소스   — 아이 화면이 부모 전용 모듈·액션·화면을 import 하는가
 *   ② 산출물 — `.next/server/app/child/**` 에 `/parent/` 문자열이 남아 있는가
 *
 *   node tools/scan_child_bundle.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// 🔴 `pathname` 을 쓰면 한글 폴더가 URL 인코딩돼 경로를 못 찾는다 — 조용히 「번들 없음」이 된다
const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** 아이 화면 코드가 있는 곳 */
const CHILD_DIRS = ["src/app/child", "src/components/child"];

/**
 * 🔴 **부모 전용**. 아이 화면이 이걸 import 하면 실패다.
 *    `modules/allowance` · `savings` · `mission` 등은 **양쪽이 쓰는 모듈**이라 여기 없다 —
 *    넣으면 아이 통장이 못 돌아간다.
 */
const PARENT_ONLY = [
  "app/actions/parent-",   // 부모 전용 Server Action
  "app/parent/",           // 부모 화면
  "modules/bank",          // 충전 · 통장(보호자용)
  "modules/account",       // 마이페이지 · 카드 · 탈퇴
];

/** 산출물에서 찾을 문자열 — 부모 경로가 아이 번들에 실려 나가면 안 된다 */
const PARENT_ROUTE = "/parent/";

let failed = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`); if (!ok) failed++; };

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

console.log("오리진 분리 — 아이 화면에 부모 기능이 섞였는가\n");

// ── ① 소스: 아이 화면의 import 를 본다 ──
const sourceHits = [];
for (const dir of CHILD_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      // import 문에서만 본다 — 주석에 적힌 경로는 코드가 아니다
      if (!/^\s*(import|export)\s.*from\s+["']/.test(line)) continue;
      for (const bad of PARENT_ONLY) {
        if (line.includes(bad)) sourceHits.push(`${relative(ROOT, file)} → ${bad}`);
      }
    }
  }
}
check("🔴 아이 화면이 부모 전용 코드를 부르지 않는다", sourceHits.length === 0,
  sourceHits.length ? sourceHits.slice(0, 5).join(" · ") : "import 0건");

// ── ② 산출물: 아이 라우트 번들에 부모 경로 문자열이 있는가 ──
const outDir = join(ROOT, ".next/server/app/child");
if (!existsSync(outDir)) {
  console.log("  건너뜀 아이 번들이 없다 — `npm run build` 뒤에 다시 돌린다");
} else {
  const bundleHits = [];
  for (const file of walk(outDir)) {
    if (!/\.(js|mjs)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    if (text.includes(PARENT_ROUTE)) bundleHits.push(relative(ROOT, file));
  }
  check(`🔴 아이 번들에 \`${PARENT_ROUTE}\` 문자열이 0건`, bundleHits.length === 0,
    bundleHits.length ? bundleHits.slice(0, 5).join(" · ") : `${walk(outDir).length}개 파일 검사`);
}

console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
if (failed > 0) {
  console.log("\n🔴 아이 화면은 부모 기능을 부르지 않는다. 필요한 값이 있으면");
  console.log("   부모 전용 모듈이 아니라 **양쪽이 쓰는 모듈**을 통해 받는다.");
}
process.exit(failed === 0 ? 0 : 1);
