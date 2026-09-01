import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  autoCompleteStaleMissions, countOverdue, listPendingForGuardian, photoMissionIds,
  remindStaleMissions,
} from "@/modules/mission";
import { approveMissionAction, rejectMissionAction, approveAllAction } from "@/app/actions/parent-mission";
import {
  approveLabel, BULK_THRESHOLD, bulkLabel, empty, expireNotice, fromLessonBadge,
  needLogin, overdueNotice, photoAlt, photoNotice, reasonPlaceholder, reasonRequired,
  rejectLabel, retroNotice,
} from "./mission.fixture";

// PRC-001 · PRC-003 — 승인 대기와 일괄 승인
export const metadata = { title: "승인 대기 · 핀프렌즈" };

export default async function ParentMissionsPage({
  searchParams,
}: {
  // 🔴 사유 없이 돌려보내려 한 미션 id — 그 카드에만 알림을 띄운다
  searchParams: Promise<{ needReason?: string }>;
}) {
  const sp = await searchParams;
  const g = await currentGuardian();
  if (!g) {
    return (
      <Screen role="부모 화면" title="승인 대기">
        <Empty emoji="🔒" {...needLogin} />
      </Screen>
    );
  }

  /**
   * 🔴 **화면을 열 때 만료를 처리한다.** `pg_cron` 이 없어서다 (`ADR-T02`).
   *    배치가 붙으면 같은 함수를 배치가 부르면 되고 이 화면은 안 바뀐다.
   *    먼저 만료시키고 목록을 읽어야 이미 끝난 것이 승인 대기에 안 남는다.
   */
  await autoCompleteStaleMissions({ guardianId: g.guardianId });
  await remindStaleMissions({ guardianId: g.guardianId });

  const [pendings, overdue] = await Promise.all([
    listPendingForGuardian(g.guardianId),
    countOverdue(g.guardianId),
  ]);
  // 🔴 사진이 붙은 미션만 자리를 만든다. 사진은 **선택**이므로 없는 것이 정상이다
  const withPhoto = await photoMissionIds(pendings.map((p) => p.id));

  return (
    <Screen role="부모 화면" title="승인 대기" sub={`${pendings.length}건`}>
      {pendings.length === 0 ? (
        <Empty emoji="✅" {...empty} />
      ) : (
        <>
          <Card tone="grow">
            <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{retroNotice.title}</h2>
            <p className="mt-1 text-[0.88em] leading-relaxed">{retroNotice.body}</p>
          </Card>

          {/* PRC-003 — 밀린 게 많을 때만 열린다. 평소엔 한 건씩 보게 한다 */}
          {pendings.length >= BULK_THRESHOLD ? (
            <form action={approveAllAction} className="mt-2">
              <input type="hidden" name="missionIds" value={pendings.map((p) => p.id).join(",")} />
              <button className="min-h-touch w-full rounded-card bg-primary text-[0.86em] font-bold text-white">
                {bulkLabel} ({pendings.length}건)
              </button>
            </form>
          ) : null}

          {/*
            🔴 알림 인프라가 없어 화면 표시로 대신한다 (D37).
               다그치지 않는다 — 말해야 하는 것은 **아이가 기다리고 있다**는 사실이다.
          */}
          {overdue > 0 ? (
            <p className="mt-2 rounded-card border border-dashed border-line-2 px-3 py-2 text-[0.78em] leading-relaxed text-ink-soft">
              {overdueNotice(overdue)}
            </p>
          ) : null}

          <ul className="mt-2 grid gap-1.5">
            {pendings.map((p) => (
              <li key={p.id} className="rounded-card border border-line bg-surface p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[0.9em]">{p.title}</b>
                  <span className="shrink-0 text-[0.72em] text-ink-mute">{p.whenLabel}</span>
                </div>
                {p.fromLesson ? (
                  <p className="mt-0.5 text-[0.72em] font-bold text-primary-d">📚 {fromLessonBadge}</p>
                ) : null}
                <div className="mt-1 flex items-center justify-between">
                  <span className="rounded-full bg-primary-bg px-2 py-0.5 text-[0.7em] text-primary-d">
                    {p.icon} {p.topicLabel}
                  </span>
                  <span className="text-[0.78em] text-star-d">⭐ {p.reward}</span>
                </div>

                {/*
                  🔴 사진은 **판정하면 사라진다** (AC-032-1 · AC-032-2).
                     경로가 no-store 라 브라우저에도 안 남는다.
                */}
                {withPhoto.has(p.id) ? (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/parent/bank/missions/photo/${p.id}`}
                      alt={photoAlt}
                      className="max-h-56 w-full rounded-card border border-line object-contain"
                    />
                    <p className="mt-1 text-[0.72em] leading-relaxed text-ink-mute">{photoNotice}</p>
                  </div>
                ) : null}

                {/*
                  🔴 **한 폼에 두 버튼이다.** 사유 칸이 버튼 줄 **아래**에 있어야 하는데
                     폼을 둘로 나누면 그 칸이 거절 폼 밖에 놓여 값이 안 실린다.
                     `formAction` 으로 버튼마다 다른 액션을 건다 — 승인은 사유를 무시한다.

                  🔴 사유 칸에 `required` 를 걸 수 없다. 같은 폼이라 **승인까지 막힌다.**
                     그래서 서버가 검사하고 돌려보낸다 (`AC-6.2`).
                */}
                <form className="mt-2 grid gap-1.5">
                  <input type="hidden" name="missionId" value={p.id} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      formAction={approveMissionAction}
                      className="min-h-touch w-full rounded-card bg-primary text-[0.82em] font-bold text-white"
                    >
                      {approveLabel}
                    </button>
                    <button
                      formAction={rejectMissionAction}
                      className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.82em] text-ink-soft"
                    >
                      {rejectLabel}
                    </button>
                  </div>
                  <input
                    name="reason" maxLength={40} placeholder={reasonPlaceholder}
                    className="min-h-touch w-full rounded-card border border-line-2 bg-surface px-2.5 text-[0.76em]"
                  />
                  {/* 🔴 이 미션에서 사유 없이 돌려보내려 한 경우만 */}
                  {sp.needReason === p.id ? (
                    <p className="text-[0.74em] leading-relaxed text-miss">{reasonRequired}</p>
                  ) : null}
                </form>
              </li>
            ))}
          </ul>

          {/* 🔴 기다림에 끝이 있다는 것을 부모도 알아야 한다 (FR-032) */}
          <p className="mt-3 text-[0.72em] leading-relaxed text-ink-mute">{expireNotice}</p>
        </>
      )}
    </Screen>
  );
}
