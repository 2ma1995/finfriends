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
  PRACTICE_BY_TOPIC, STAGE_EMOJI, STAGE_LABEL, STAGE_LADDER,
  nextRule, practiceNeeded, stageFor, subjectParticle, topRule,
} from "@/contracts/growth";
import { TOPUP_AMOUNTS } from "@/contracts/bank";
import { MAX_PCT, WANTED_CHOICES } from "@/modules/savings";
import { PIN_LENGTH, PIN_MAX_TRIES } from "@/lib/session/child-mode-pin";
import { EXPIRE_HOURS, REMIND_HOURS } from "@/modules/mission";
import { MAX_TOPUP, MOVED_CODES } from "@/modules/allowance";
import { eul, i as iParticle, josa } from "@/lib/korean";
import { isGuardianPath } from "@/lib/session/device-mode";

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

console.log(failed === 0 ? "\n전건 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
