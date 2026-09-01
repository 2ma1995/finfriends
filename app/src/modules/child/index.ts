import "server-only";
import { prisma } from "@/db";

/**
 * 아이 이름 — 🔴 **조인이 아니라 별도 조회다.**
 *
 * `REQ-NF-009` 가 금지하는 것은 **아동 식별정보와 학습·실천 데이터의 결합 조회**다.
 * 이름 하나를 따로 읽어 코드에서 합치는 것은 그 금지에 걸리지 않는다 —
 * `getPassbook` 이 보호자 이자율을 읽는 방식과 같다.
 *
 * 🔴 **이름 말고는 아무것도 안 가져온다.** `select` 를 넓히면 생년·기기 종류가
 *    딸려 오고, 그 순간 화면이 안 쓰는 식별정보를 들고 있게 된다 (수집 최소화).
 *
 * 🔴 **없으면 `null` 이다.** 화면이 「내 방」으로 떨어질 뿐 깨지지 않는다 —
 *    이름은 꾸밈이지 관문이 아니다.
 */
export async function getChildName(childId: string): Promise<string | null> {
  const c = await prisma.childAccount.findUnique({
    where: { id: childId },
    select: { displayName: true },
  });
  return c?.displayName ?? null;
}
