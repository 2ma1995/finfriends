import Link from "next/link";
import { Screen, Empty } from "@/components/shared/Screen";
import { MoneyHUD } from "@/components/child/MoneyHUD";
import { RoomStage } from "@/components/child/RoomStage";
import { MyItems } from "@/components/child/MyItems";
import { TodayList, type TodayItem } from "@/components/child/TodayList";
import { hasPlanToday } from "@/modules/plan";
import { getTodayBoard } from "@/modules/practice";
import { getChildName } from "@/modules/child";
import {
  emptyCategory, emptyRoom, itemsTitle, missionMore, myItemsHint, restCount,
  roomTitle, shopLink, today, todayAllDone, todoTitle,
} from "./room.fixture";
import { getRoom, placedItems } from "@/modules/items";
import { getWalletTotals } from "@/modules/allowance";
import { markAttendance } from "@/modules/attendance";
import { currentChild } from "@/lib/session/current-child";
import { getMissionBoard } from "@/modules/mission";
import { getTourState } from "@/modules/onboarding";
import { restartTourAction } from "@/app/actions/onboarding";
import { consentRequired, finishBonus, noDevice, restartLabel } from "../welcome/welcome.fixture";
import { attendanceNotice } from "./room.fixture";
import { redirect } from "next/navigation";
import { shouldAsk } from "@/modules/schedule";
import { PlanAskModal } from "@/components/child/PlanAskModal";
import { labels as planLabels, placeholders as planPlaceholders, submitLabel as planSubmit } from "../plan/new/plan.fixture";
import * as ask from "./ask.fixture";

// UX-003 · STR-003 · STR-005 — 아이가 여는 첫 화면
const won = (n: number) => n.toLocaleString("ko-KR") + "원";
export const metadata = { title: "내 방 · 핀프렌즈" };

export default async function ChildHomePage({
  searchParams,
}: {
  searchParams: Promise<{ turn?: string; edit?: string; welcome?: string;
                          planned?: string; error?: string }>;
}) {
  // 🔴 촬영 통로 — 방 각도와 꾸미기 모드. 헤드리스에서 클릭을 못 하므로 URL 로 연다
  const sp = await searchParams;
  const turn = Number(sp.turn ?? 0) || 0;
  const startEdit = sp.edit === "1";
  const justFinished = sp.welcome === "1";

  // 🔴 미션만 실제 값을 읽는다. 「할 게 있는지」를 홈에서 알 수 없으면 아이는 미션 화면에 안 들어간다
  const access = await currentChild();

  // 🔴 **기기가 등록 안 됐으면 방을 보여주지 않는다.**
  //    예전엔 여기서 그냥 예시 데이터로 방을 그렸다. 그래서 토큰이 만료되거나 잘못돼도
  //    화면이 멀쩡히 뜨고 — 남의 방이 자기 방처럼 보였다. 실패는 눈에 보여야 한다.
  if (!access.ok) {
    return (
      <Screen role="아이 화면" title="내 방">
        <Empty emoji="🔒" {...(access.reason === "CONSENT_REQUIRED" ? consentRequired : noDevice)} />
      </Screen>
    );
  }

  // 🔴 첫 진입이면 설명부터. 아이는 보호자와 달리 아무 안내도 받은 적이 없다 (D13).
  //    건너뛴 아이는 다시 붙잡지 않는다 — 가두는 화면이 첫 경험이 되면 안 된다
  const tour = await getTourState(access.childId);
  if (!tour.finished && !tour.skipped) redirect("/child/welcome");

  /**
   * 🔴 **출석 별은 아이가 처음 여는 화면에서 준다** (FR-010).
   *    KST 기준 1일 1회이고, 같은 날 몇 번 열어도 멱등키가 막는다.
   *    별을 못 줘도 화면은 열린다 — 출석은 덤이지 관문이 아니다.
   */
  const attended = await markAttendance(access.childId);

  /**
   * 🔴 **하교 시각이 지났는데 오늘 계획이 없을 때만** 묻는다 (D41).
   *    조건은 넷 다 서버가 본다 — 화면은 뜨라면 뜬다.
   */
  const [board, room, allowance, askState, plannedToday, cells, childName] = await Promise.all([
    getMissionBoard(access.childId),
    getRoom(access.childId),
    getWalletTotals(access.childId),
    shouldAsk(access.childId),
    hasPlanToday(access.childId),
    getTodayBoard(access.childId),
    getChildName(access.childId),
  ]);
  const placed = placedItems(room);

  /**
   * 🔴 **오늘 남은 것만 줄로 만든다.** 링크를 늘 네 개 두던 것을 바꿨다 —
   *    할 게 있든 없든 같아 보이면 아이가 넷을 다 눌러 봐야 안다.
   *
   * 🔴 **판단을 여기서 새로 하지 않는다.** 계획은 `hasPlanToday`, 실천·읽기·문제는
   *    실천 화면이 쓰는 `getTodayBoard` 를 그대로 본다 — 두 화면이 갈라지면
   *    홈은 「남았다」는데 실천 화면은 「다 했다」가 된다.
   */
  const open = cells.filter((c) => !c.viaSavings);
  const items: TodayItem[] = [];
  if (!plannedToday) items.push(today.plan);

  const lessonLeft = open.filter((c) => c.lessonToday).length;
  if (lessonLeft > 0) items.push({ ...today.lesson, note: restCount(lessonLeft) });

  const practiceLeft = open.filter((c) => !c.needsLesson && !c.practicedToday).length;
  if (practiceLeft > 0) items.push({ ...today.practice, note: restCount(practiceLeft) });

  const quizLeft = cells.filter((c) => !c.quizDone).length;
  if (quizLeft > 0) items.push({ ...today.quiz, note: restCount(quizLeft) });

  return (
    <Screen role="아이 화면" title={roomTitle(childName)}>
      {/* 🔴 받았을 때만 말한다. 매번 띄우면 아이가 무시하게 된다 */}
      {attended.granted ? (
        <p className="mb-2 rounded-card border border-star bg-star-bg px-3 py-2 text-center text-sub font-bold text-star-d">
          {attendanceNotice}
        </p>
      ) : null}

      {justFinished ? (
        <p className="mb-2 rounded-card border border-star bg-star-bg px-3 py-2 text-center text-sub font-bold text-star-d">
          {finishBonus}
        </p>
      ) : null}

      {sp.planned ? (
        <p className="mb-2 rounded-card border border-primary-l bg-primary-bg px-3 py-2 text-center text-sub font-bold text-primary-d">
          {ask.plannedNotice}
        </p>
      ) : null}

      <MoneyHUD stars={room.stars} allowance={allowance.total} />

      {askState.ask ? (
        <PlanAskModal
          schoolEnd={askState.schoolEnd}
          title={ask.askTitle} body={ask.askBody}
          yesLabel={ask.yesLabel} noLabel={ask.noLabel} noHint={ask.noHint}
          formTitle={ask.formTitle} closeLabel={ask.closeLabel}
          labels={planLabels} placeholders={planPlaceholders} submitLabel={planSubmit}
        />
      ) : null}

      <div className="mt-3 rounded-card border border-line bg-surface py-3">
        <RoomStage items={placed} layout={room.layout} characterId={room.characterId}
                   wear={room.wear} turn={turn} startEdit={startEdit}
                   sideAction={
                     <Link href="/child/shop"
                           className="flex min-h-touch w-full items-center justify-center rounded-card border border-primary bg-primary text-sub font-bold text-white">
                       🛍 {shopLink}
                     </Link>
                   } />
        {placed.length === 0 ? (
          <p className="mt-1 text-center text-cap text-ink-mute">
            <b>{emptyRoom.title}</b> · {emptyRoom.body}
          </p>
        ) : null}
      </div>

      {/* 🔴 한 줄로 접어 두고 고른 것만 아래에 편다 — **가진 것만** 보여준다 */}
      <MyItems owned={room.owned} placedCount={placed.length}
               title={itemsTitle} emptyCat={emptyCategory} hint={myItemsHint} />

      <TodayList title={todoTitle} missions={board.todo} items={items}
                 allDone={todayAllDone} missionMore={missionMore} won={won} />

      <form action={restartTourAction} className="mt-4">
        <button className="min-h-touch w-full text-sub text-ink-mute underline underline-offset-2">
          {restartLabel}
        </button>
      </form>
    </Screen>
  );
}
