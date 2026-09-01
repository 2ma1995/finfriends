import "dotenv/config";
import { readFileSync } from "node:fs";
/**
 * 순수 판정 검증 — 🔴 **실제 코드를 부른다.**
 *
 * 🔴 **왜 새로 만들었나.** `verify_*.mjs` 일곱 개가 판정 로직을 **베껴** 갖고 있었다.
 *    사다리·조사·PIN 규칙·사진 규칙을 사본으로 두면 **원본이 바뀌어도 검증은 통과한다.**
 *    실제로 두 번 새어나갔다 —
 *      ① 나무를 4단계로 바꿨는데 검증은 3단계 사본으로 통과했다
 *      ② `GUARDIAN_PREFIXES` 가 늘었을 때는 **좋아진 변경인데 실패**했다
 *
 * 🔴 `--conditions=react-server` 로 돈다. 그 조건이 없으면 `server-only` 가 예외를 던진다.
 *
 *   npm run verify:logic
 */
import {
  PRACTICE_BY_TOPIC, STAGE_EMOJI, STAGE_LABEL, STAGE_LADDER, STALL_DAYS,
  blockedBy, nextRule, practiceNeeded, stageFor, subjectParticle, topRule,
} from "@/contracts/growth";
import { MAX_TOPUP, TOPUP_AMOUNTS } from "@/contracts/bank";
import { MAX_PCT, WANTED_CHOICES } from "@/modules/savings";
import { PIN_LENGTH, PIN_MAX_TRIES } from "@/lib/session/child-mode-pin";
import { EXPIRE_HOURS, REMIND_HOURS } from "@/modules/mission";
// 🔴 `MAX_TOPUP` 은 `modules/allowance` 가 **계약을 그대로 재수출**한 것이다 —
//    같은 이름을 두 번 가져오면 `tsc` 가 중복으로 막는다. 계약 쪽 하나만 쓴다
import { MOVED_CODES } from "@/modules/allowance";
import { eul, i as iParticle, josa } from "@/lib/korean";
import { isGuardianPath } from "@/lib/session/device-mode";
import { pushEnabled, saveSubscription } from "@/lib/push";
import { exactWhen, relativeWhen } from "@/lib/when";

let failed = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`${ok ? "  OK  " : "  실패"} ${n}${d ? ` — ${d}` : ""}`);
  if (!ok) failed++;
};

console.log("순수 판정 — 실제 코드를 부른다\n");

// ── 나무 사다리 (FR-030) ──
check("단계가 네 개다", Object.keys(STAGE_LABEL).length === 4,
  Object.values(STAGE_LABEL).join(" · "));
check("이모지가 단계마다 있다", Object.keys(STAGE_EMOJI).length === 4,
  Object.values(STAGE_EMOJI).join(""));
check("사다리가 세 칸이다", STAGE_LADDER.length === 3, "새싹은 조건이 없으므로 오르는 칸은 셋");

check("🔴 실천 0 이면 학습·퀴즈를 다 채워도 새싹", stageFor("EARN", 99, 99, 0) === 0,
  "실천 없이는 자라지 않는다 (AC-030-1)");
check("벌기는 실천 2로 나무", stageFor("EARN", 5, 4, 2) === 1);
check("벌기 실천 1 이면 새싹에 머문다", stageFor("EARN", 5, 4, 1) === 0);
check("🔴 영역마다 실천 조건이 다르다", practiceNeeded("SAVE", 1) !== practiceNeeded("EARN", 1),
  `모으기 ${practiceNeeded("SAVE", 1)} · 벌기 ${practiceNeeded("EARN", 1)}`);
check("불리기는 어느 단계든 실천 1", [1, 2, 3].every((s) => practiceNeeded("GROW", s as 1 | 2 | 3) === 1),
  "적금은 자주 할 수 있는 일이 아니다");
check("새싹은 실천 0", practiceNeeded("EARN", 0) === 0);
check("최고 단계에서 nextRule 은 null", nextRule("EARN", 3) === null);
check("topRule 이 마지막 조건을 준다", topRule("EARN").learn === STAGE_LADDER[2].learn);
check("네 영역 모두 조건표가 있다", Object.keys(PRACTICE_BY_TOPIC).length === 4);

// ── 정체 판정 · 원인 문구 (GRW-002 · AC-030-2) ──
check("정체 기준이 14일이다", STALL_DAYS === 14, "한 달 주기의 절반");

/**
 * 🔴 **모자란 것을 전부 말한다** (`ACE-3.1`). 하나만 말하면 그것을 채운 부모가
 *    「또 안 올랐다」를 겪는다.
 */
const short2 = blockedBy([
  { label: "학습", current: 2, required: 5 },
  { label: "퀴즈", current: 1, required: 4 },
  { label: "미션 실천", current: 2, required: 2 },
]);
check("🔴 모자란 것을 전부 말한다", /학습 3편/.test(short2!) && /퀴즈 3개/.test(short2!), short2 ?? "");
check("🔴 채운 것도 말한다", /충족/.test(short2!), "모자란 것만 적으면 아무것도 안 한 줄 안다");
/**
 * 🔴 **받침을 코드가 고른다.** 「미션 실천**는** 충족」이 나왔다 —
 *    라벨이 영역마다 다르다(미션 실천 · 계획 지키기 · 모으기 실천).
 */
check("🔴 충족 문구의 조사가 맞다", /미션 실천은 충족/.test(short2!), short2 ?? "");
check("  받침 없는 라벨에는 「는」",
  /계획 지키기는 충족/.test(blockedBy([
    { label: "학습", current: 1, required: 5 },
    { label: "계획 지키기", current: 2, required: 2 },
  ])!));

const oneShort = blockedBy([
  { label: "학습", current: 5, required: 5 },
  { label: "퀴즈", current: 4, required: 4 },
  { label: "미션 실천", current: 1, required: 2 },
]);
check("한 가지만 모자라면 그것만", /실천 1회 남았어요/.test(oneShort!) && /학습·퀴즈는 충족/.test(oneShort!),
  oneShort ?? "");

check("다 채웠으면 원인 문구가 없다",
  blockedBy([{ label: "학습", current: 5, required: 5 }]) === null,
  "🔴 채운 사람에게 「남았어요」를 보이면 안 된다");

check("단위가 조건마다 다르다",
  /학습 1편/.test(blockedBy([{ label: "학습", current: 4, required: 5 }])!)
  && /퀴즈 1개/.test(blockedBy([{ label: "퀴즈", current: 3, required: 4 }])!),
  "「학습 1개」가 아니라 「학습 1편」이다");

// ── 조사 (lib/korean) ──
check("받침 있으면 「이」", iParticle("서연").endsWith("이"));
check("받침 없으면 「가」", iParticle("민수").endsWith("가"));
/**
 * 🔴 받침이 **없는** 말이다 — 「학비를」이 맞고 「학비을」이 버그였다.
 *    아이가 목표 이름을 직접 적으므로 코드가 골라야 한다.
 */
check("🔴 목표 이름에도 조사가 붙는다", eul("학비") === "학비를" && eul("자전거") === "자전거를");
check("받침 있는 목표 이름", eul("물감") === "물감을");
check("한글이 아니면 받침 없는 쪽", josa("iPad", "을", "를") === "를");
check("나무 단계 라벨에도 쓴다", subjectParticle(STAGE_LABEL[1]) === "가",
  "「나무가 되기까지」");

// ── 금액 (contracts/bank · modules/allowance) ──
check("자주 쓰는 금액 세 개", TOPUP_AMOUNTS.length === 3, TOPUP_AMOUNTS.join(" · "));
check("🔴 상한이 있다", MAX_TOPUP === 500_000, "0 하나 더 눌린 실수를 막는다");
/**
 * 🔴 `INTEREST_CHOICES` 는 `D28-b` 에서 **지웠다.** 이자율은 적금 승인 화면에서
 *    건마다 입력받는다 — 후보 목록이 필요 없어졌다.
 *    사본을 쓰던 검증은 이 사실을 몰랐다. **실제 코드를 부르니 바로 걸렸다.**
 */
check("이자율 상한이 있다", MAX_PCT > 0 && MAX_PCT <= 100, `${MAX_PCT}%`);
check("아이가 바랄 수 있는 이자율이 오름차순",
  WANTED_CHOICES.every((v, k, a) => k === 0 || v > a[k - 1]!), WANTED_CHOICES.join(" · "));
/**
 * 🔴 **넷이다** — 위시리스트 둘 + 적금 둘. 처음엔 둘이었는데 적금이 더해졌다.
 *    부모 기록 화면이 이 목록을 하나로 묶어 쓰다가 **적금을 「목표로 옮김」으로**
 *    표시하고 있었다. 사본을 쓰던 검증은 이 변화를 몰랐다.
 */
check("🔴 옮긴 것은 「나감」과 구별된다", MOVED_CODES.length === 4, MOVED_CODES.join(" · "));
check("🔴 위시리스트와 적금이 섞여 있다",
  MOVED_CODES.some((c) => c.startsWith("WISH_")) && MOVED_CODES.some((c) => c.startsWith("SAVINGS_")),
  "화면은 둘을 갈라 말해야 한다 — 묶인 곳이 다르다");

// ── 미션 시간 (FR-032) ──
check("리마인드가 만료보다 먼저다", REMIND_HOURS < EXPIRE_HOURS, `${REMIND_HOURS}h < ${EXPIRE_HOURS}h`);
check("만료는 72시간", EXPIRE_HOURS === 72);

// ── PIN (D42) ──
check("PIN 은 네 자리", PIN_LENGTH === 4);
check("🔴 시도 한도가 있다", PIN_MAX_TRIES > 0 && PIN_MAX_TRIES <= 10,
  `${PIN_MAX_TRIES}번 — 네 자리는 10,000가지뿐이다`);

// ── 아동 모드 관문 (D5 · S5) ──
check("🔴 /parent 가 막힌다", isGuardianPath("/parent") && isGuardianPath("/parent/bank/missions"));
check("🔴 /unlock 은 막지 않는다", !isGuardianPath("/unlock"),
  "막으면 아이 기기에서 PIN 을 넣을 자리가 없어진다 (D42)");
check("아이 화면·로그인은 막지 않는다", !isGuardianPath("/child/home") && !isGuardianPath("/login"));

// ── 소스에서 확인하는 것 — 실행으로는 못 보는 구조 ──
const src = (rel: string) => readFileSync(new URL(`../src/${rel}`, import.meta.url), "utf8");

/**
 * 주석을 뺀 코드.
 *
 * 🔴 **주석이 검사를 속인다.** 「한때 `disabled={total + a > MAX_TOPUP}` 을 걸었다」고
 *    주석에 적었더니 「그 코드가 없는지」 보는 검사가 **주석을 코드로 읽고 실패**했다.
 *    있어서는 안 되는 것을 찾는 검사는 반드시 이쪽을 쓴다 —
 *    안 그러면 「왜 이렇게 안 했는지」를 적을 수 없게 된다.
 */
const code = (rel: string) =>
  src(rel).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/**
 * 🔴 **로그인 시도 제한** (D54). 없어서 비밀번호를 무한히 시도할 수 있었다 —
 *    네 자리 PIN 은 다섯 번이면 잠그는데 부모 비밀번호는 안 막았다.
 */
const auth = src("lib/session/guardian-session.ts");
check("🔴 로그인 시도 제한이 있다", /MAX_LOGIN_TRIES/.test(auth), "무차별 대입을 막는다");
check("  잠긴 동안은 맞는 비밀번호도 안 받는다", /lockedUntil && user\.lockedUntil > new Date/.test(auth),
  "안 그러면 잠금이 뜻을 잃는다");
check("  맞으면 세던 것을 되돌린다", /failedAttempts: 0/.test(auth),
  "안 되돌리면 오타가 쌓여 멀쩡한 부모가 잠긴다");
check("  영구 잠금이 아니다", /LOCK_MINUTES/.test(auth), "부모가 자기 계정에서 영영 못 들어오면 안 된다");
check("🔴 없는 이메일도 같은 답을 준다", /if \(!user\) return \{ ok: false, reason: "BAD_CREDENTIALS" \}/.test(auth),
  "계정 존재가 새면 공격자가 먼저 이메일 목록을 만든다");

/**
 * 🔴 **자동 완료가 한 트랜잭션이다** (D54). 전에는 실천·별·용돈·상태를 따로 썼다 —
 *    중간에 죽으면 별과 돈은 나갔는데 상태는 PENDING 으로 남는다.
 */
const mission = src("modules/mission/index.ts");
check("🔴 자동 완료가 트랜잭션이다", /\$transaction\(async \(tx\) => \{/.test(mission),
  "중간에 죽으면 별은 나갔는데 상태가 PENDING 으로 남는다");
check("  미션 단위로 묶는다", /for \(const m of stale\)[\s\S]{0,900}?\$transaction/.test(mission),
  "스무 건을 한 트랜잭션에 넣으면 하나가 실패할 때 멀쩡한 열아홉이 되돌아간다");

/** 🔴 탈퇴도 한 트랜잭션이어야 한다 — 절반만 지워진 계정이 남으면 안 된다 */
check("🔴 탈퇴가 트랜잭션이다", /\$transaction\(\[/.test(src("modules/account/index.ts")));

// ── 「언제」 (D59) ──

/**
 * 🔴 **경과 시간이 아니라 달력 날짜로 센다.** 다섯 모듈이 각자 사본으로
 *    `Math.floor((now - at) / 864e5)` 를 갖고 있었다 — 어제 23시에 적은 줄을
 *    오늘 8시에 보면 9시간 경과라 `0` 이 되어 **「오늘」이라고 말했다.**
 *    부모가 어제 넣은 용돈을 오늘 넣은 것으로 읽는다.
 */
{
  const now = new Date(Date.UTC(2026, 8, 1, 23, 0)); // 9/2 08:00 KST
  const at = new Date(Date.UTC(2026, 8, 1, 14, 0));  // 9/1 23:00 KST
  check("🔴 어제 늦게 적은 줄을 「어제」라고 한다", relativeWhen(at, now) === "어제",
    "경과 시간으로 세면 9시간이라 「오늘」이 된다");
  check("  자정을 조금 넘겨도 날짜가 바뀐다",
    relativeWhen(new Date(Date.UTC(2026, 8, 1, 14, 50)), new Date(Date.UTC(2026, 8, 1, 15, 30))) === "어제",
    "KST 23:50 → 00:30 은 40분 차이지만 어제다");
  check("  같은 날은 「오늘」이다",
    relativeWhen(new Date(Date.UTC(2026, 8, 1, 1, 0)), new Date(Date.UTC(2026, 8, 1, 10, 0))) === "오늘");
}

/**
 * 🔴 **부모가 줄을 고르는 화면은 시각까지 보여야 한다** (사용자 지적).
 *    「보낸돈 수정하기」에서 오늘 적은 줄이 셋이면 셋 다 「오늘」이었다 —
 *    어느 것을 되돌리는지 알 수 없다.
 */
{
  const now = new Date(Date.UTC(2026, 8, 1, 10, 0));
  check("🔴 부모용은 날짜와 시각을 적는다", exactWhen(new Date(Date.UTC(2026, 8, 1, 5, 32)), now) === "9월 1일 14:32",
    "「오늘」은 줄이 전부 같은 날일 때 모든 줄에 붙어 자리만 먹는다");
  check("  같은 날이어도 「오늘」이라고 하지 않는다",
    !exactWhen(new Date(Date.UTC(2026, 8, 1, 5, 32)), now).includes("오늘"),
    "사용자가 두 번 지적한 자리다 — 30줄이 전부 「오늘」로 시작했다");
  check("  KST 로 읽는다", exactWhen(new Date(Date.UTC(2026, 8, 1, 15, 5)), new Date(Date.UTC(2026, 8, 2, 16, 0))) === "9월 2일 00:05",
    "서버가 UTC 로 돌면 9시간 어긋난다 — Vercel 이 UTC 다");
  check("  해가 다르면 해를 적는다", exactWhen(new Date(Date.UTC(2025, 8, 1, 5, 32)), now) === "2025년 9월 1일 14:32",
    "안 적으면 작년 9월과 올해 9월이 같아 보인다");
}

/** 🔴 사본이 다시 생기지 않게 — 모듈이 자기 계산을 갖고 있으면 안 된다 */
for (const m of ["allowance", "card", "star-ledger", "mission", "plan"]) {
  check(`  ${m} 이 자기 날짜 계산을 갖지 않는다`,
    !/\/ 864e5\)/.test(src(`modules/${m}/index.ts`)),
    "사본은 같은 버그를 여러 벌 갖게 된다 — 실제로 다섯 벌이었다");
}

/** 🔴 아이 화면에 시각이 새어 나가지 않는다 — 기본값이 상대말이어야 한다 */
check("🔴 원장 목록의 기본은 상대말이다",
  /when: "relative" \| "exact" = "relative"/.test(src("modules/allowance/index.ts")),
  "기본을 exact 로 두면 아이 화면(getPassbook)에 시각이 나간다");

/**
 * 🔴 **되돌리기는 `TOPUP` 만이다** (사용자 요청).
 *
 *    전에는 서버가 `ADJUST` 도 받았다. 그래서 「부모님이 고쳤어요」를 **또 되돌릴 수** 있었고
 *    아이 통장이 「받았다 → 취소 → 취소취소」로 읽혔다.
 *
 *    🔴 그리고 **화면과 서버가 어긋나 있었다** — 화면은 「부모가 적은 것」을 보이고
 *    서버는 `TOPUP`·`ADJUST` 둘을 받았다. 판정을 모듈 한 곳(`reversible`)으로 모았다.
 */
const allowance = src("modules/allowance/index.ts");
check("🔴 되돌리기는 TOPUP 만 받는다", /if \(e\.code !== "TOPUP"\) return \{ ok: false, reason: "NOT_ALLOWED" \}/.test(allowance),
  "상쇄의 상쇄는 아무도 못 읽는다 — 잘못 되돌렸으면 용돈을 다시 넣는다");
check("  판정이 모듈에 있다", /reversible: r\.code === "TOPUP" && !undone\.has\(r\.id\)/.test(allowance),
  "화면이 조건을 다시 조립하면 서버와 어긋난다 — 실제로 어긋나 있었다");
check("  화면은 그 판정을 그대로 쓴다",
  /history\.filter\(\(h\) => h\.reversible\)/.test(src("app/parent/bank/adjust/page.tsx")),
  "화면이 byGuardian 으로 다시 걸러서 상쇄 줄이 목록에 남았다");
check("  이미 되돌린 것은 멱등키가 막는다", /adjust:\$\{e\.id\}/.test(allowance),
  "두 번 누르면 두 번 상쇄된다");

/**
 * 🔴 **금액 버튼이 바로 넣지 않는다** (사용자 요청). 누르는 순간 적히면
 *    잘못 누른 것을 되돌릴 기회가 없다 — 아이 화면 숫자가 즉시 바뀐다.
 */
const topup = src("components/parent/TopUpForm.tsx");
check("🔴 금액 버튼이 제출하지 않는다", /type="button"/.test(topup),
  "`type` 을 빼면 폼이 제출돼 예전 동작으로 돌아간다");
check("  빈 칸으로는 못 누른다", /amount\.trim\(\)\.length === 0/.test(topup));

/**
 * 🔴 **누르면 더한다** (사용자 요청). 30,000 + 10,000 + 5,000 으로 45,000 을 만든다.
 */
check("🔴 금액 버튼이 누적한다", /const next = total \+ a;/.test(topup),
  "바꾸기만 하면 45,000 같은 금액을 버튼으로 만들 수 없다");
check("  비울 방법이 있다", /setAmount\(""\)/.test(topup),
  "더하기만 되면 틀렸을 때 칸을 손으로 지워야 한다 — 그건 방법이 아니라 요령이다");

/**
 * 🔴 **상한을 넘기면 알린다.** 그리고 **넘기는 누름은 반영하지 않는다** —
 *    500,000 으로 맞춰 주면 부모가 안 누른 금액이 칸에 남는다.
 *
 * 🔴 **버튼을 미리 막지 않는다.** `disabled` 를 걸면 `bump` 가 안 불려서
 *    **알림이 영원히 안 뜬다** — 한 번 그렇게 짜서 잡았다.
 */
check("🔴 상한을 넘기면 알린다", /if \(next > MAX_TOPUP\) \{[\s\S]{0,400}?alert\(/.test(topup),
  "조용히 잘라내면 부모가 누른 것과 다른 숫자가 들어간다");
check("  넘기는 누름은 반영하지 않는다", /alert\([\s\S]{0,500}?\);\s*\n\s*return;/.test(topup),
  "잘라서 넣으면 부모가 안 누른 금액이 칸에 남는다");
check("  버튼을 미리 막지 않는다", !/disabled=\{total \+ a/.test(code("components/parent/TopUpForm.tsx")),
  "막으면 bump 가 안 불려서 알림이 영원히 안 뜬다");

/**
 * 🔴 **상한이 한 숫자다.** 계약에 있어서 화면과 서버가 같은 값을 본다 —
 *    한동안 화면이 `max={500000}` 을 따로 적고 있었다.
 */
check("🔴 상한이 계약에 있다", MAX_TOPUP === 500_000, "화면·서버가 같은 숫자를 본다");
check("  화면이 숫자를 다시 적지 않는다", !/500000|500_000/.test(code("components/parent/TopUpForm.tsx")),
  "한쪽만 바꾸면 조용히 갈린다");
check("  서버도 계약을 쓴다",
  /export \{ MAX_TOPUP \} from "@\/contracts\/bank"/.test(allowance),
  "서버가 자기 숫자를 갖고 있으면 갈린다");
check("  통장 화면에 즉시 제출 폼이 남지 않았다",
  !/action=\{topUpMockAction\}[\s\S]{0,200}?type="hidden" name="amount"/.test(src("app/parent/bank/page.tsx")),
  "숨은 amount 를 가진 폼이 남아 있으면 그 버튼은 여전히 바로 넣는다");

// ── 웹 푸시 (D56) ──

/**
 * 🔴 **알림함이 원본이고 푸시는 사본이다.** 푸시 발송이 알림 생성을 막으면 안 된다 —
 *    푸시 서버가 잠깐 죽었을 때 미션 승인 흐름 전체가 멈춘다.
 */
check("🔴 푸시 발송이 알림 생성 뒤에 온다",
  /prisma\.notification\.create[\s\S]{0,700}?await sendToGuardian/.test(mission),
  "먼저 보내면 발송이 실패할 때 알림함에 줄이 안 남는다");
check("  발송 실패를 삼킨다", /await sendToGuardian\([\s\S]{0,400}?\} catch \{/.test(mission),
  "던지면 푸시 서버가 죽었을 때 승인 흐름이 멈춘다");
check("🔴 이미 알린 것에는 푸시도 안 보낸다",
  /code !== "P2002"\) throw e;\s*\n\s*return;/.test(mission),
  "중복 알림에 푸시를 보내면 부모 폰에 같은 알림이 두 번 뜬다");

const push = src("lib/push/index.ts");
check("🔴 죽은 구독을 지운다", /code === 404 \|\| code === 410/.test(push),
  "안 지우면 매번 실패하는 줄이 영원히 쌓인다 — 실제로 FCM 은 410, 모질라는 404 를 준다");
check("  한 기기가 실패해도 나머지에 보낸다", /Promise\.allSettled/.test(push),
  "`Promise.all` 이면 첫 실패에서 나머지 기기가 못 받는다");
check("  주인이 바뀌면 옮긴다", /update: \{ guardianId/.test(push),
  "기기를 다른 보호자가 쓰기 시작했는데 안 옮기면 엉뚱한 사람에게 알림이 간다");
check("🔴 푸시 본문에 이름·금액을 넣지 않는다",
  !/sendToGuardian\([\s\S]{0,300}?(childName|payoutWon|displayName)/.test(mission),
  "푸시는 잠금화면에 뜬다 — 폰을 든 사람은 누구나 읽는다");

/**
 * 🔴 **`web-push` 를 파일 맨 위에서 불러오지 않는다** (D60).
 *
 *    처음엔 정적 `import` 였다. 임포트 사슬이
 *    `child/layout.tsx` → `modules/mission` → `lib/push` 라서,
 *    `npm install` 안 한 워크트리에서 **모든 화면이 `Module not found` 로 죽었다.**
 *    푸시는 부모 알림 하나인데 아이가 앱을 못 쓰게 된다.
 *
 *    아이가 「했어요」를 누르면 부모 알림이 생기므로 **사슬 자체는 맞다.**
 *    고칠 것은 「없을 때 죽는 것」이다.
 */
check("🔴 web-push 를 늦게 불러온다", !/^import .*from "web-push"/m.test(push),
  "맨 위에서 불러오면 설치 안 된 워크트리의 아이 화면이 전부 죽는다");
check("  없으면 푸시만 빠진다", /catch \{[\s\S]{0,200}?lib = null/.test(push),
  "패키지가 없어도 알림함은 그대로 돌아야 한다");

/** 🔴 키가 없어도 앱이 돌아야 한다 — 새 팀원의 `.env` 에는 VAPID 키가 없다 */
check("🔴 키 없음을 오류로 만들지 않는다", typeof pushEnabled() === "boolean",
  "키가 없으면 푸시만 빠지고 알림함은 그대로 돌아야 한다");

/**
 * 🔴 **문에서 값을 검사한다** — 실제 함수를 부른다.
 *    Server Action 은 공개 엔드포인트다 (§6.6 ②).
 */
const P256_OK = "BLcjyaIuQmgFoK91YWezVxb5L8cXArrclrb5jMj9I_IsY0gGMrXzjhJuXRATZOCqPl4jXkvGiHNTpR9Hmjt9G-Q";
const FAKE_G = "00000000-0000-0000-0000-000000000000";
/**
 * 🔴 이 실행기(`tsx --conditions=react-server`)는 **top-level await 를 못 받는다**
 *    (`ERR_REQUIRE_ASYNC_MODULE`). DB 를 부르는 검사는 함수로 감싸고
 *    마무리 보고를 그 뒤로 옮긴다.
 */
async function asyncChecks() {
for (const [label, bad] of [
  ["http 주소", { endpoint: "http://나쁜주소", keys: { p256dh: P256_OK, auth: "YWJjZGVmZ2hpamtsbW5v" } }],
  ["빈 키", { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "", auth: "" } }],
  /**
   * 🔴 길이(65바이트)와 접두(0x04)는 맞지만 **곡선 위에 없는** 값이다.
   *    저장하면 발송 때마다 암호화가 로컬에서 터지고 HTTP 상태가 없어
   *    「죽은 구독」으로도 안 잡혀 영원히 남는다 — 실제로 그 상태를 만들어 보고 넣은 검사다.
   */
  ["곡선 밖 키", { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "BEl6" + "A".repeat(83), auth: "YWJjZGVmZ2hpamtsbW5v" } }],
] as const) {
  const r = await saveSubscription(FAKE_G, bad);
  check(`  ${label} 를 막는다`, r.ok === false, "화면이 보낸 값을 믿지 않는다");
}
}

/**
 * 🔴 **서비스 워커가 fetch 를 가로채지 않는다.** 이 앱은 잔액·미션 상태처럼
 *    낡으면 안 되는 숫자를 보여준다 — 워커가 캐시를 돌려주면 부모와 아이가
 *    다른 잔액을 본다 (D21 과 같은 사고).
 */
const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
check("🔴 서비스 워커가 fetch 를 가로채지 않는다", !/addEventListener\(\s*["']fetch["']/.test(sw),
  "캐시를 돌려주면 부모와 아이가 다른 잔액을 본다");
check("  push 와 notificationclick 만 듣는다",
  (sw.match(/self\.addEventListener\(\s*"(\w+)"/g) ?? []).length === 4,
  "install·activate·push·notificationclick 넷이다");

/**
 * 🔴 **비밀 키가 화면으로 내려가지 않는다.** `NEXT_PUBLIC_` 접두가 붙은 것만
 *    브라우저로 간다 — 비밀 키에 그 접두가 붙으면 **누구나 우리 이름으로 푸시를 보낸다.**
 */
check("🔴 비밀 키가 브라우저로 안 간다",
  !/NEXT_PUBLIC_VAPID_PRIVATE/.test(push + src("app/parent/mypage/page.tsx")),
  "붙으면 누구나 우리 이름으로 푸시를 보낼 수 있다");
check("  화면은 공개 키만 받는다", /publicKey/.test(src("components/parent/PushOptIn.tsx")) &&
  !/VAPID_PRIVATE_KEY/.test(src("components/parent/PushOptIn.tsx")));

/** 🔴 구독 등록은 세션에서 보호자를 꺼낸다 — 인자로 받으면 남의 집 알림을 받는다 */
const pushAction = src("app/actions/push.ts");
check("🔴 구독 등록이 세션에서 보호자를 꺼낸다",
  /requireGuardian\(\)/.test(pushAction) && !/guardianId: string/.test(pushAction),
  "인자로 받으면 아무나 남의 보호자 id 에 자기 기기를 붙인다");

asyncChecks()
  .catch((e) => { console.error(e); failed += 1; })
  .finally(() => {
    console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
    process.exit(failed === 0 ? 0 : 1);
  });
