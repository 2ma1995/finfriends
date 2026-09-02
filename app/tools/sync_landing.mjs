/**
 * 랜딩을 원본에서 배포본으로 옮긴다 — 어긋남 대장 D69.
 *
 * 🔴 **두 벌이 갈려 있었다.** 다시 짠 디자인이 `web/landing.html` 에만 들어가서
 *    **한 번도 배포된 적이 없었다.** 「화면 보기」는 `web/service-example.html` 이
 *    안 옮겨져 운영에서 **404** 였다.
 *
 * 🔴 **왜 지우고 한 벌로 안 하는가** — `web/` 은 GTM 문서가 지정한 산출물이다
 *    (`docs/gtm-docs/[GTM]FinFriends-Funnel-Strategy.md` — 「대상 산출물」).
 *    기획 쪽이 그 파일을 본다. 그래서 **원본은 그대로 두고 생성물로 잇는다** —
 *    이 저장소가 태스크 리스트에 쓰는 방식과 같다(`tasks_data.py` → 생성기).
 *
 * 🔴 **왜 「다르면 세운다」가 아닌가** — 두 파일은 **정당하게 다르다.**
 *    원본은 디자인용이라 「무료로 시작하기」가 자기 구역(`#start`)을 가리키고,
 *    배포본은 실제 가입 화면으로 가야 한다. 그냥 견주면 늘 실패한다.
 *    그래서 **변환을 코드에 적고, 다시 생성해서 견준다.**
 *
 *   node tools/sync_landing.mjs            검사만 — 다르면 빌드를 세운다
 *   node tools/sync_landing.mjs --write    실제로 옮긴다 (원본을 고친 뒤 이걸 돌린다)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 🔴 한글 경로가 percent-encode 되지 않게 `fileURLToPath` 를 쓴다 (겪었다)
const root = fileURLToPath(new URL("../../", import.meta.url));
const WRITE = process.argv.includes("--write");

/**
 * 옮길 파일과 그때 바꾸는 것.
 *
 * 🔴 **변환을 여기 적는다.** 손으로 바꾸면 다음 사람이 무엇이 바뀌는지 모른다.
 */
const FILES = [
  {
    name: "landing.html",
    /**
     * 🔴 원본은 디자인용이라 CTA 가 자기 구역(`id="start"`)으로 점프한다.
     *    배포본에서는 실제 가입 화면으로 가야 한다 (사용자 요청).
     */
    swap: [['href="#start"', 'href="/signup"']],
  },
  {
    name: "service-example.html",
    // 🔴 바꿀 것이 없다. 한 바이트도 안 다르다 — 그래도 옮기는 것은 이 스크립트가 한다
    swap: [],
  },
];

/** 생성물 머리에 붙이는 말. 🔴 손으로 고치는 것을 막는 유일한 장치다 */
const header = (name) => `<!--
  🔴 **이 파일은 생성물이다. 손으로 고치지 마라.**

     원본은 \`web/${name}\` 이다. 거기를 고친 뒤 이걸 돌린다:

         node app/tools/sync_landing.mjs --write

     \`prebuild\` 가 **다시 생성해서 견준다** — 원본만 고치고 안 옮기면 빌드가 선다.
     한동안 두 벌을 각각 고쳤고, 그래서 다시 짠 디자인이 **한 번도 배포되지 않았다**
     (어긋남 대장 D69).
-->
`;

/**
 * 🔴 **변환을 «먼저» 하고 그 다음에 머리말을 붙인다.**
 *
 *    거꾸로 하면 머리말 «본문의» `href="#start"` 까지 바뀌어서,
 *    무엇을 바꾸는지 설명하는 문장이 **자기가 설명하려던 것을 잃는다.**
 *    (저쪽 세션이 짚었다 — 우연히 맞는 순서로 했던 것이라 안 드러났다.)
 */
function build({ name, swap }) {
  let out = readFileSync(`${root}web/${name}`, "utf8");
  for (const [from, to] of swap) out = out.split(from).join(to);
  return header(name) + out;
}

/**
 * 🔴 **변환 목록을 잊어도 잡히게 한다.**
 *
 *    누가 원본에 `<a class="cta" href="#signup">` 을 새로 넣으면 변환 목록에 없으니
 *    그대로 통과하고, 배포본에서 **죽은 버튼**이 된다.
 *    그래서 생성물에 「누르는 것인데 앵커로 가는 링크」가 있으면 세운다.
 *    오늘 죽은 CTA 가 실제로 나가 있었고, 이 검사가 있었으면 안 나갔다.
 */
function deadCtas(html) {
  const found = [];
  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    if (!/class="[^"]*\bcta\b/.test(tag)) continue;
    const href = tag.match(/href="([^"]*)"/);
    if (href && href[1].startsWith("#")) found.push(href[1]);
  }
  return found;
}

let failed = 0;
console.log("랜딩 원본 → 배포본\n");

for (const spec of FILES) {
  const want = build(spec);
  const target = `${root}app/public/${spec.name}`;

  const dead = deadCtas(want);
  if (dead.length > 0) {
    console.log(`  실패 ${spec.name} — 앵커로 가는 CTA ${dead.length}개: ${dead.join(", ")}`);
    console.log(`       변환 목록(\`swap\`)에 추가하거나 원본의 링크를 실제 경로로 바꾼다`);
    failed += 1;
    continue;
  }

  if (WRITE) {
    writeFileSync(target, want);
    console.log(`  옮김 ${spec.name}`);
    continue;
  }

  const have = readFileSync(target, "utf8");
  if (have === want) {
    console.log(`  OK   ${spec.name}`);
  } else {
    console.log(`  실패 ${spec.name} — 원본과 어긋난다`);
    console.log(`       \`node app/tools/sync_landing.mjs --write\` 를 돌리고 같이 커밋한다`);
    failed += 1;
  }
}

if (failed > 0) process.exit(1);
console.log(WRITE ? "\n옮김 완료" : "\n전건 통과");
