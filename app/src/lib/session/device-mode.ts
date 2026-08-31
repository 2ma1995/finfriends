/**
 * 기기 모드 — 어긋남 대장 D5 · REQ-NF-011 · S5.
 *
 * 🔴 **아동은 독립 자격증명을 갖지 않는다.** 그래서 아이 기기에도 살아 있는 것은 보호자 세션이고,
 *    막지 않으면 아이가 `/parent/**`(승인·결제)에 들어간다 — 보호자 승인(PRC-001)의 전제가 무너진다.
 *
 * 막는 방식이 **링크를 숨기는 것이 아니라 경로를 막는 것**인 이유 —
 * 주소를 직접 치면 열리기 때문이다. 클라이언트 판정은 금지다(REQ-NF-008 과 같은 규율).
 */
export const MODE_COOKIE = "ff_device";

export type DeviceMode = "GUARDIAN" | "CHILD";

/** 보호자 전용 경로 — 아동 모드에서 서버가 막는다 */
export const GUARDIAN_PREFIXES = ["/parent"] as const;

export function isGuardianPath(pathname: string) {
  return GUARDIAN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 쿠키 값 → 모드.
 * 🔴 쿠키는 **힌트일 뿐**이다. 지울 수도 고칠 수도 있다.
 *    실제 판정은 `device_sessions` 표를 보는 서버가 한다 — 이 함수는 미들웨어의 1차 관문이다.
 */
export function readMode(raw: string | undefined): DeviceMode {
  return raw === "CHILD" ? "CHILD" : "GUARDIAN";
}
