import { prisma } from "@/db";
import { sendToGuardian } from "@/lib/push";

/**
 * 보호자 알림 — 어긋남 대장 D51 · D56 · **D75**.
 *
 * 🔴 **미션 모듈 안에 숨어 있던 것을 여기로 뺐다.** 알릴 일은 미션만이 아니다 —
 *    적금 신청처럼 **부모가 안 누르면 아이가 못 나아가는** 일이 더 있다.
 *    저쪽에서 알리려고 미션 모듈을 부르게 두면, 저금 코드가 미션에 매인다.
 *
 * 🔴 **여기가 유일한 알림 생성 지점이다.** 종류가 늘어도 이 문 하나를 거친다 —
 *    푸시도 여기 한 곳에만 붙는다. 호출부마다 흩으면 새 알림을 더할 때 빠뜨린다.
 */

/**
 * 알림 종류. 🔴 **`ref` 는 반드시 채운다** — 비우면 「한 번만」 장치가 죽는다(D75).
 *
 *   MISSION_*        ref = 미션 id
 *   SAVINGS_REQUESTED ref = 적금 약속 id
 *   FIRST_*          ref = 아이 id — 「이 아이의 첫 …」이므로 아이당 한 번이다
 */
export type NotifyKind =
  | "MISSION_WAITING_NEW" | "MISSION_WAITING" | "MISSION_AUTO_DONE"
  | "SAVINGS_REQUESTED" | "FIRST_PLAN" | "FIRST_SAVING";

export type NotificationView = {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly whenLabel: string;
  readonly unread: boolean;
  /** 🔴 눌러서 «갈 곳». 없으면 알림이 읽을거리로 끝난다 */
  readonly href: string;
};

/**
 * 🔴 **종류마다 갈 곳을 여기서 정한다.** 화면이 `kind` 를 보고 분기하면,
 *    새 종류를 더할 때 화면도 같이 고쳐야 하는 것을 잊는다.
 */
function hrefOf(kind: string): string {
  if (kind.startsWith("MISSION")) return "/parent/bank/missions";
  if (kind === "SAVINGS_REQUESTED") return "/parent/bank/savings";
  if (kind === "FIRST_PLAN") return "/parent/spending";
  if (kind === "FIRST_SAVING") return "/parent/tree";
  return "/parent/tree";
}

function whenLabel(at: Date, now = new Date()) {
  const min = Math.floor((now.getTime() - at.getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

/**
 * 한 번만 알린다 + 폰으로 밀어 보낸다.
 *
 * 🔴 **표에 줄이 남는 것이 「알렸다」의 정의다.** 푸시는 그것을 폰에 띄우는 수단이다 —
 *    실패해도 던지지 않는다. 반대로 하면 푸시 서버가 잠깐 죽었을 때
 *    미션 승인 흐름 전체가 멈춘다.
 *
 * 🔴 **중복이면 푸시도 안 보낸다.** `P2002` 는 이미 알린 것이다 —
 *    그때 푸시를 보내면 부모 폰에 같은 알림이 두 번 뜬다.
 *
 * 🔴 **본문에 아이 이름·금액을 넣지 않는다.** 푸시는 잠금화면에 뜬다 —
 *    폰을 든 사람은 누구나 읽는다.
 */
export async function notifyOnce(
  guardianId: string, kind: NotifyKind, ref: string, title: string, body: string,
) {
  try {
    /**
     * 🔴 **미션 알림은 옛 칸도 같이 채운다** (D75 · 1단계).
     *    지금 도는 배포본은 `mission_id` 로 「아직 못 본 미션」을 찾는다.
     *    배포를 되돌려야 할 때 이 칸이 비어 있으면 그 기능이 죽는다 —
     *    두 칸이 같이 있는 동안에는 양쪽을 다 채워 둔다.
     *    2단계에서 옛 칸을 지울 때 이 줄도 같이 지운다.
     */
    await prisma.notification.create({
      data: {
        guardianId, kind, refId: ref, title, body,
        ...(kind.startsWith("MISSION") ? { missionId: ref } : {}),
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    return;
  }

  try {
    await sendToGuardian(guardianId, {
      title,
      body,
      // 🔴 tag 를 대상 단위로 묶는다. 같은 것에 여러 번 알려도 잠금화면엔 한 줄이다
      tag: `${kind}:${ref}`,
      url: hrefOf(kind),
    });
  } catch {
    // 🔴 삼킨다 — 위 주석대로 푸시는 수단이지 알림 자체가 아니다
  }
}

/** 안 읽은 알림 수 — 부모 화면 오른쪽 위 벨이 쓴다 */
export async function countUnread(guardianId: string) {
  return prisma.notification.count({ where: { guardianId, readAt: null } });
}

export async function listNotifications(guardianId: string, take = 30): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { guardianId }, orderBy: { createdAt: "desc" }, take,
    select: { id: true, kind: true, title: true, body: true, readAt: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id, kind: r.kind, title: r.title, body: r.body,
    whenLabel: whenLabel(r.createdAt),
    unread: r.readAt === null,
    href: hrefOf(r.kind),
  }));
}

/**
 * 🔴 **읽음은 화면을 열 때 찍는다.** 각 줄에 「읽음」 버튼을 두면 아무도 안 누르고
 *    배지가 영영 안 사라진다. 목록을 봤다는 것이 읽었다는 뜻이다.
 */
export async function markAllRead(guardianId: string) {
  await prisma.notification.updateMany({
    where: { guardianId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** 아이를 지울 때 함께 지운다 — 계정 정리(D41)가 부른다 */
export async function deleteForGuardian(guardianId: string) {
  await prisma.notification.deleteMany({ where: { guardianId } });
}
