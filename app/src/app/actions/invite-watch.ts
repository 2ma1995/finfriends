"use server";

import { prisma } from "@/db";
import { requireGuardian } from "@/lib/session/guardian-session";

/**
 * 아이 기기가 등록됐는지 묻는다 — 어긋남 대장 D76.
 *
 * 🔴 **부모가 그 화면에서 «기다리고» 있다.** 링크를 넘겨주고 아이가 열기를
 *    기다리는 중이라, 등록이 끝나면 화면이 스스로 다음으로 가야 한다.
 *    안 그러면 부모는 **아무 일도 안 일어나는 화면**을 보고 있게 된다.
 *
 * 🔴 **다른 기기에서 일어나는 일이다.** 아이 폰에서 등록하므로 부모 화면은
 *    그 사실을 알 길이 없다 — 물어보는 것 말고는.
 *
 * 🔴 첫 줄에서 인가를 확인한다 (§6.6). `guardianId` 를 인자로 받지 않는다 —
 *    받으면 남의 집 등록 여부를 물을 수 있다.
 */
export async function isChildDeviceRegistered(): Promise<boolean> {
  const g = await requireGuardian();
  const n = await prisma.deviceSession.count({
    where: { guardianId: g.guardianId, mode: "CHILD", revokedAt: null },
  });
  return n > 0;
}
