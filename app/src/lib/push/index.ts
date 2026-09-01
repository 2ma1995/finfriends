import "server-only";
import { prisma } from "@/db";

/**
 * 웹 푸시 발송 — 어긋남 대장 D56.
 *
 * 🔴 **알림함이 원본이고 푸시는 사본이다.** `activity.notifications` 에 줄이 남는 것이
 *    「알렸다」의 정의이고, 푸시는 그 줄을 부모 폰에 **띄워 주는 수단**일 뿐이다.
 *    그래서 이 파일의 함수는 **절대 던지지 않는다** — 푸시가 실패해도
 *    알림 자체는 성립해야 한다. 반대로 하면 구글 푸시 서버가 잠깐 죽었을 때
 *    미션 승인 흐름 전체가 멈춘다.
 *
 * 🔴 **보호자에게만 보낸다.** 아이 기기 구독을 만들지 않으므로 보낼 대상이 없다 —
 *    알림은 부모가 판정하라고 보내는 것이다.
 *
 * 🔴 **죽은 구독을 지운다.** 브라우저를 지우거나 알림을 끄면 푸시 서비스가
 *    404 · 410 을 준다. 안 지우면 매번 실패하는 줄이 영원히 쌓이고,
 *    나중에 「몇 명이 푸시를 받고 있나」를 셀 수 없게 된다.
 *
 * 🔴 **본문에 아이 정보를 담지 않는다.** 푸시 본문은 잠금화면에 뜨고
 *    푸시 서비스(구글·애플)를 거친다. 암호화되어 서비스는 못 읽지만,
 *    **폰을 든 사람은 누구나 읽는다.** 그래서 미션 제목까지만 넣고
 *    이름·금액·사진은 넣지 않는다 — 자세한 것은 앱을 열어야 보인다.
 *
 * 왜 라이브러리를 쓰는가 — 웹 푸시는 본문을 **기기별 키로 암호화**해야 한다
 * (ECDH P-256 → HKDF → AES-128-GCM). 직접 구현하면 조용히 틀리고,
 * 틀리면 「보냈는데 안 뜬다」로 나타나 원인을 찾기 어렵다.
 * `REQ-TEC-007` 은 **UI 라이브러리**만 제한하므로 이 의존성은 제약 밖이다.
 */

/**
 * 🔴 **`web-push` 를 늦게 불러온다** (어긋남 대장 D60).
 *
 *    처음엔 파일 맨 위에서 `import` 했다. 그러자 **아이 화면이 전부 죽었다** —
 *    임포트 사슬이 `child/layout.tsx` → `modules/mission` → `lib/push` 였고,
 *    다른 워크트리는 `npm install` 을 안 한 상태라 `Module not found` 가
 *    **모든 화면**에 떴다. 푸시는 부모 알림 하나인데 아이가 앱을 못 쓰게 된다.
 *
 *    아이가 「했어요」를 누르면 부모 알림이 생기므로(`notifyOnce`) **사슬 자체는 맞다.**
 *    고칠 것은 사슬이 아니라 **없을 때 죽는 것**이다 — 키가 없어도 조용히 빠지게
 *    만들어 뒀는데, 패키지가 없을 때는 그렇게 안 돼 있었다. 같은 규칙을 적용한다.
 */
type WebPush = typeof import("web-push");
let lib: WebPush | null | undefined;

async function push(): Promise<WebPush | null> {
  if (lib !== undefined) return lib;
  try {
    const m = await import("web-push");
    const wp = ((m as { default?: WebPush }).default ?? m) as WebPush;
    wp.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    lib = wp;
  } catch {
    // 설치 안 됨 — 푸시만 빠지고 알림함은 그대로 돈다
    lib = null;
  }
  return lib;
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:noreply@finfriends.local";

/**
 * 키가 없으면 푸시를 끈다.
 *
 * 🔴 **키 없음이 오류가 아니다.** 새로 받아 온 팀원은 `.env` 에 VAPID 키가 없다
 *    (저장소에 안 들어가므로 — `.env.example` 참조). 그때 앱이 죽으면 안 된다.
 *    푸시만 조용히 빠지고 알림함은 그대로 돈다.
 */
export function pushEnabled(): boolean {
  return PUBLIC_KEY.length > 0 && PRIVATE_KEY.length > 0;
}

export type PushPayload = {
  title: string;
  body: string;
  /** 알림을 눌렀을 때 열 주소. 부모 화면 안이어야 한다 */
  url: string;
  /**
   * 같은 tag 는 **덮어쓴다**. 미션 하나에 대해 리마인드가 여러 번 가도
   * 잠금화면에 한 줄만 남게 한다 — 쌓이면 부모가 알림을 끈다.
   */
  tag: string;
};

/**
 * 한 보호자의 모든 기기에 보낸다.
 *
 * 🔴 던지지 않는다. 실패는 값으로 돌려주고 부르는 쪽은 무시해도 된다.
 */
export async function sendToGuardian(
  guardianId: string,
  payload: PushPayload,
): Promise<{ sent: number; dropped: number }> {
  if (!pushEnabled()) return { sent: 0, dropped: 0 };
  const webpush = await push();
  if (!webpush) return { sent: 0, dropped: 0 };

  let subs;
  try {
    subs = await prisma.pushSubscription.findMany({ where: { guardianId } });
  } catch {
    // 표가 아직 없는 환경(마이그레이션 미적용)에서도 알림함은 돌아야 한다
    return { sent: 0, dropped: 0 };
  }
  if (subs.length === 0) return { sent: 0, dropped: 0 };

  const json = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  // 🔴 한 기기가 실패해도 나머지에 보낸다 — `allSettled` 다
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
        // 🔴 24시간까지만 유효하다. 그 뒤에 뜨는 알림은 이미 지난 일이다
        { TTL: 60 * 60 * 24 },
      ),
    ),
  );

  results.forEach((r, i) => {
    if (r.status === "fulfilled") { sent += 1; return; }
    const code = (r.reason as { statusCode?: number }).statusCode;
    // 404 = 그런 구독 없음, 410 = 사라짐. 둘 다 되살아나지 않는다
    if (code === 404 || code === 410) dead.push(subs[i].endpoint);
  });

  try {
    if (dead.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
    }
    if (sent > 0) {
      await prisma.pushSubscription.updateMany({
        where: { guardianId, endpoint: { notIn: dead } },
        data: { lastSentAt: new Date() },
      });
    }
  } catch {
    // 정리 실패는 발송 결과를 바꾸지 않는다
  }

  return { sent, dropped: dead.length };
}

/** 기기 등록. 같은 기기가 다시 부르면 갱신이다 — endpoint 가 그 기기다 */
export async function saveSubscription(
  guardianId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<{ ok: boolean }> {
  const endpoint = sub.endpoint?.trim() ?? "";
  const p256dh = sub.keys?.p256dh ?? "";
  const auth = sub.keys?.auth ?? "";
  // 🔴 화면이 보낸 값을 믿지 않는다. Server Action 은 공개 엔드포인트다 (§6.6 ②)
  if (!endpoint.startsWith("https://") || p256dh.length === 0 || auth.length === 0) {
    return { ok: false };
  }
  /**
   * 🔴 **키가 진짜 P-256 점인지 문에서 확인한다.**
   *
   *    길이(65바이트)와 접두(0x04)만 보면 통과하지만 **곡선 위에 없는** 값이 있다.
   *    그런 줄을 저장하면 발송할 때마다 암호화가 로컬에서 터지고 —
   *    HTTP 상태가 없으므로 「죽은 구독」으로도 안 잡혀 **영원히 남는다.**
   *    실제로 그 상태를 만들어 보고 나서 이 검사를 넣었다.
   */
  if (!(await isValidP256(p256dh))) return { ok: false };
  /**
   * 🔴 **주인이 바뀔 수 있다.** 부모가 한 기기에서 로그아웃하고 다른 보호자로
   *    로그인하면 같은 endpoint 가 다른 사람 것이 된다. `update` 로 주인을 옮긴다 —
   *    안 옮기면 **엉뚱한 사람에게 알림이 간다.**
   */
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { guardianId, endpoint, p256dh, auth },
    update: { guardianId, p256dh, auth },
  });
  return { ok: true };
}

/** 기기 해제. 부모가 「알림 끄기」를 누르면 이 기기 줄만 지운다 */
export async function removeSubscription(guardianId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { guardianId, endpoint } });
}

/** 이 보호자가 푸시를 받는 기기 수 */
export async function countSubscriptions(guardianId: string): Promise<number> {
  try {
    return await prisma.pushSubscription.count({ where: { guardianId } });
  } catch {
    return 0;
  }
}

/**
 * base64url 로 온 공개 키가 실제 P-256 점인지 본다.
 *
 * 🔴 `importKey` 가 곡선 검사를 해 준다 — 직접 계산하지 않는다.
 *    타원곡선 위 판정을 손으로 쓰면 조용히 틀린다.
 */
async function isValidP256(base64Url: string): Promise<boolean> {
  try {
    const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
    const raw = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    // 비압축 점은 0x04 + x(32) + y(32) = 65바이트다
    if (raw.length !== 65 || raw[0] !== 0x04) return false;
    await crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, false, []);
    return true;
  } catch {
    return false;
  }
}
