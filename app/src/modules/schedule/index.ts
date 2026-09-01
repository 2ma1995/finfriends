import { prisma } from "@/db";
import { kstDay } from "@/modules/attendance";

/**
 * 하교 시각 — 어긋남 대장 D41.
 *
 * 🔴 **묻는 때를 부모가 정한다.** 「오늘 쓸 계획 있니?」를 아무 때나 물으면
 *    등교 전에도 잠들기 전에도 뜬다. 물어서 쓸모 있는 순간은 **아이가 학교에서
 *    나와 돈을 쓸 수 있게 된 직후** 하나뿐이고, 그 시각을 아는 것은 부모다.
 *
 * 🔴 **막지 않는다.** 하교 시각이 없어도 앱은 그대로 돌아간다 —
 *    부모가 안 정했다고 아이 화면이 멈추면 안 된다 (출석과 같은 규칙).
 */

/** 자정 기준 분으로 본 지금 — 🔴 서버가 어디서 돌든 **아이가 사는 시계**로 센다 */
export function kstMinutes(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}

/** `900` → `"15:00"` — 화면과 `<input type="time">` 이 같이 쓴다 */
export function toClock(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** `"15:00"` → `900`. 형식이 틀리면 `null` 이다 — 부르는 쪽이 판단한다 */
export function fromClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export async function getSchedule(childId: string) {
  const row = await prisma.childSchedule.findUnique({
    where: { childId },
    select: { schoolEndMin: true, askedDay: true },
  });
  return row;
}

/**
 * 보호자가 하교 시각을 정한다.
 * 🔴 **바꾸면 오늘 물은 기록을 지운다.** 3시로 잘못 넣었다가 2시로 고쳤는데
 *    「오늘은 이미 물었다」가 남아 있으면 **그날은 영영 안 묻는다.**
 */
export async function setSchoolEnd(childId: string, guardianId: string, minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    throw new Error("하교 시각이 하루 밖이다");
  }
  await prisma.childSchedule.upsert({
    where: { childId },
    create: { childId, guardianId, schoolEndMin: minutes },
    update: { schoolEndMin: minutes, askedDay: null },
  });
}

export type AskState =
  | { ask: false }
  | { ask: true; schoolEnd: string };

/**
 * 오늘 물어야 하나 — 🔴 **조건이 넷 다 맞을 때만** 묻는다.
 *
 *   ① 부모가 하교 시각을 정했다
 *   ② 그 시각이 지났다
 *   ③ 오늘 만든 계획 카드가 없다   ← 있으면 물을 것이 없다
 *   ④ 오늘 아직 안 물었다          ← 「없어요」를 한 번 눌렀으면 그날은 끝이다
 *
 * ③ 이 핵심이다. 사용자가 말한 **「소비계획이 없을 때만」**이 이것이다.
 */
export async function shouldAsk(childId: string, now = new Date()): Promise<AskState> {
  const row = await getSchedule(childId);
  if (!row) return { ask: false };                        // ①
  if (kstMinutes(now) < row.schoolEndMin) return { ask: false };  // ②

  const today = kstDay(now);
  if (row.askedDay === today) return { ask: false };       // ④

  // ③ 오늘 만든 계획 카드 — KST 하루의 경계를 UTC 로 돌려서 센다
  const dayStart = new Date(Date.parse(`${today}T00:00:00.000Z`) - 9 * 60 * 60 * 1000);
  const madeToday = await prisma.planCard.count({
    where: { childId, createdAt: { gte: dayStart } },
  });
  if (madeToday > 0) return { ask: false };

  return { ask: true, schoolEnd: toClock(row.schoolEndMin) };
}

/**
 * 「오늘은 계획 없어요」 — 오늘은 다시 묻지 않는다.
 * 🔴 **계획을 만들었을 때는 부르지 않는다.** 카드가 생기면 ③ 이 스스로 막는다 —
 *    여기까지 적으면 **내일 카드를 지웠을 때** 왜 안 묻는지 알 수 없게 된다.
 */
export async function markAsked(childId: string, now = new Date()) {
  await prisma.childSchedule.update({
    where: { childId },
    data: { askedDay: kstDay(now) },
  });
}
