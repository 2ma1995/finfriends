import "server-only";
import { grantStar } from "@/modules/star-ledger";

/**
 * 출석 별 — `FR-010`.
 *
 * 🔴 **KST 기준 1일 1회**다. 서버가 어디서 돌든 아이가 사는 날짜로 센다 —
 *    UTC 로 세면 한국 시간 오전 9시 전에 연 아이가 「어제」로 잡혀 하루를 잃는다.
 *
 * 🔴 **WPA 분자에 넣지 않는다** (AC-010-1). 접속만으로 실천 지표가 오르면
 *    「실천 없이는 자라지 않는다」가 무너진다. 그래서 `PracticeCredit` 을 만들지 않는다 —
 *    퀴즈와 같은 이유다.
 *
 * 🔴 중복은 **DB 가 막는다.** 멱등키가 날짜를 담고 있어 같은 날 몇 번 열어도 한 번이다.
 *    오프라인 뒤 재연결도 같은 키로 들어온다 (`FR-010` 예외).
 */

/** KST 기준 오늘 — 서버 시간대와 무관하게 아이가 사는 날짜 */
export function kstDay(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export type AttendanceResult = { granted: boolean; day: string };

/**
 * 아이가 화면을 열 때 부른다.
 * 🔴 **화면을 막지 않는다.** 별을 못 줘도 아이는 앱을 쓸 수 있어야 한다 —
 *    출석은 덤이지 관문이 아니다.
 */
export async function markAttendance(childId: string, now = new Date()): Promise<AttendanceResult> {
  const day = kstDay(now);
  try {
    const r = await grantStar({
      childId,
      triggerCode: "ATTENDANCE",
      delta: 1,
      idempotencyKey: `attendance:${childId}:${day}`,
    });
    return { granted: r.ok && !r.duplicated, day };
  } catch {
    return { granted: false, day };
  }
}
