import { NextResponse, type NextRequest } from "next/server";
import { autoCompleteStaleMissions, remindStaleMissions } from "@/modules/mission";

/**
 * 정해진 시각에 도는 미션 정리 — 어긋남 대장 D77.
 *
 * 🔴 **왜 필요한가.** 「24시간째 안 보셨어요」와 「72시간 지나 자동 완료」는
 *    시각이 지나야 생기는 알림인데, 지금까지 **부모가 미션 화면을 열 때만**
 *    계산됐다. 부모가 안 열면 영영 안 돈다 — 정작 안 열고 있는 부모에게
 *    알려야 하는 기능이 그 부모에게만 안 가는 셈이었다.
 *
 * 🔴 **로직을 SQL 로 다시 쓰지 않는다.** `pg_cron` 이 SQL 만 돌릴 수 있다고
 *    규칙을 SQL 로 옮기면 **같은 규칙이 두 벌**이 된다 — 이 저장소가 반복해서
 *    겪은 함정이다(`D24`). 그래서 `pg_cron` 이 `pg_net` 으로 **이 문을 두드리고**,
 *    규칙은 여기 한 벌만 남는다.
 *
 * 🔴 **열쇠가 없으면 아무나 부른다.** 이 문은 알림을 만들고 미션을 완료시킨다 —
 *    바깥에 열려 있으면 남이 남의 집 미션을 끝낼 수 있다.
 *    `CRON_SECRET` 이 **없으면 아예 안 연다**(닫힌 쪽으로 실패한다) —
 *    설정을 빠뜨렸을 때 「그냥 열림」이 되면 그게 제일 나쁘다.
 *
 * 🔴 **`GET` 이 아니라 `POST` 다.** GET 이면 브라우저 주소창·크롤러·미리보기가
 *    부수효과를 일으킨다. 이 문은 상태를 바꾼다.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // 🔴 설정이 없으면 닫는다. 열어 두면 설정을 빠뜨린 배포가 그대로 뚫린다
    return NextResponse.json({ ok: false, reason: "NOT_CONFIGURED" }, { status: 503 });
  }

  const given = req.headers.get("authorization");
  if (given !== `Bearer ${secret}`) {
    // 🔴 왜 틀렸는지 말하지 않는다 — 맞히려는 쪽에 단서를 준다
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  /**
   * 🔴 **자동 완료를 먼저, 리마인드를 나중에.** 순서가 반대면 방금 자동 완료된
   *    미션에도 「확인해 주세요」가 나간다 — 이미 끝난 일로 부모를 부르는 셈이다.
   */
  const completed = await autoCompleteStaleMissions();
  const reminded = await remindStaleMissions();

  return NextResponse.json({ ok: true, completed, reminded });
}
