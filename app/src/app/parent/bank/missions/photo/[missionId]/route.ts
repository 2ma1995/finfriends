import { NextResponse } from "next/server";
import { currentGuardian } from "@/lib/session/guardian-session";
import { readPhoto } from "@/modules/mission";

/**
 * 미션 사진 한 장 — 보호자만 본다. `FR-032` · 어긋남 대장 D32.
 *
 * 🔴 **인가를 여기서 다시 한다.** 미션 id 는 화면에 실려 나가는 값이라
 *    로그인만 했다고 열어 주면 **남의 아이 사진**을 볼 수 있다.
 *    `readPhoto` 가 `guardianId` 를 함께 걸어 조회한다.
 *
 * 🔴 **캐시하지 않는다.** 판정하면 원본이 사라지는데 브라우저나 CDN 에 남으면
 *    `AC-032-2`(스토리지 스캔 0건)가 화면 쪽에서 깨진다.
 *
 * 🔴 **없으면 404 다.** 판정이 끝난 미션은 사진이 없는 것이 정상이다 —
 *    오류가 아니라 「지워졌다」는 뜻이므로 화면이 자리를 비운다.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const g = await currentGuardian();
  if (!g) return new NextResponse(null, { status: 401 });

  const { missionId } = await params;
  const photo = await readPhoto(g.guardianId, missionId);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "content-type": photo.mime,
      // 🔴 어디에도 남기지 않는다
      "cache-control": "no-store, no-cache, must-revalidate, private",
      "content-disposition": "inline",
      // 이미지가 스크립트로 해석되지 않게
      "x-content-type-options": "nosniff",
    },
  });
}
