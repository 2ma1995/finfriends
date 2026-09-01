/**
 * 「언제」를 사람 말로 — 어긋남 대장 D59.
 *
 * 🔴 **한동안 다섯 모듈이 각자 사본을 갖고 있었다** (allowance · card · star-ledger ·
 *    mission · plan). 계산이 같아서 사본인 줄도 몰랐고, **같은 버그를 다섯 벌 갖고 있었다.**
 *
 * 🔴 **경과 시간이 아니라 달력 날짜로 센다.** 사본들은
 *    `Math.floor((now - at) / 864e5)` 로 셌다 — 어제 23시에 적은 줄을 오늘 8시에 보면
 *    9시간 경과라 `0` 이 되어 **「오늘」이라고 말했다.** 부모가 어제 넣은 용돈을
 *    오늘 넣은 것으로 읽는다.
 *
 * 🔴 **KST 로 센다.** 서버가 어디서 돌든 아이가 사는 날짜다 (`modules/attendance.kstDay`
 *    와 같은 관용구). Vercel 은 UTC 로 도니 이걸 안 하면 자정 전후 9시간이 어긋난다.
 */

const KST_OFFSET = 9 * 60 * 60 * 1000;

/** KST 기준 「몇 번째 날」 — 두 시각이 같은 날인지 비교하는 데 쓴다 */
function kstDayNumber(at: Date): number {
  return Math.floor((at.getTime() + KST_OFFSET) / 864e5);
}

/** KST 로 옮긴 시각 — 시·분을 읽어내는 데 쓴다 */
function kstParts(at: Date) {
  const k = new Date(at.getTime() + KST_OFFSET);
  return {
    year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate(),
    hour: k.getUTCHours(), minute: k.getUTCMinutes(),
  };
}

const hhmm = (at: Date) => {
  const { hour, minute } = kstParts(at);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/**
 * 「오늘 · 어제 · N일 전」 — **아이 화면용.**
 *
 * 🔴 아이에게는 이게 맞다. 「9월 1일」보다 「3일 전」이 얼마나 지났는지 바로 안다.
 *    다만 **같은 날 여러 줄이 있으면 구별이 안 된다** — 그래서 부모가 고르는 화면은
 *    `exactWhen` 을 쓴다.
 */
export function relativeWhen(at: Date, now = new Date()): string {
  const days = kstDayNumber(now) - kstDayNumber(at);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

/**
 * 「9월 1일 14:32」 — **부모가 줄을 고르는 화면용.**
 *
 * 🔴 **「오늘」이라고 쓰지 않는다** (2026-09-01 사용자 지적 두 번).
 *
 *    처음엔 「오늘 14:32 · 어제 09:10」으로 두고 오래된 것만 날짜를 적었다.
 *    그런데 원장 30줄이 **전부 같은 날**이면(시연·시험 데이터가 그렇다)
 *    **모든 줄이 「오늘」로 시작한다** — 「왜 다 오늘이야」가 된다.
 *    상대말은 줄이 서로 다른 날일 때만 도움이 되고, 여기서는 자리만 먹는다.
 *
 * 🔴 **부모가 여기서 하는 일은 「언제 일이었나」를 짚는 것**이다.
 *    「3일 전」은 셈을 한 번 더 시키고, 「9월 1일」은 바로 읽힌다.
 *    아이 화면은 반대다 — 거기는 `relativeWhen` 을 쓴다.
 *
 * 🔴 해가 다르면 해를 적는다 — 안 적으면 작년 9월과 올해 9월이 같아 보인다.
 */
export function exactWhen(at: Date, now = new Date()): string {
  const a = kstParts(at);
  const n = kstParts(now);
  const t = hhmm(at);
  return a.year === n.year
    ? `${a.month}월 ${a.day}일 ${t}`
    : `${a.year}년 ${a.month}월 ${a.day}일 ${t}`;
}
