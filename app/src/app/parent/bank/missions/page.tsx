import { Screen, Card, Empty } from "@/components/shared/Screen";
import { currentGuardian } from "@/lib/session/guardian-session";
import { listPendingForGuardian, photoMissionIds } from "@/modules/mission";
import { approveMissionAction, rejectMissionAction, approveAllAction } from "@/app/actions/parent-mission";
import {
  approveLabel, BULK_THRESHOLD, bulkLabel, empty, fromLessonBadge, needLogin,
  photoAlt, photoNotice, reasonPlaceholder, rejectLabel, retroNotice,
} from "./mission.fixture";

// PRC-001 · PRC-003 — 승인 대기와 일괄 승인
export const metadata = { title: "승인 대기 · 핀프렌즈" };

export default async function ParentMissionsPage() {
  const g = await currentGuardian();
  if (!g) {
    return (
      <Screen role="부모 화면" title="승인 대기">
        <Empty emoji="🔒" {...needLogin} />
      </Screen>
    );
  }

  const pendings = await listPendingForGuardian(g.guardianId);
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

                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <form action={approveMissionAction}>
                    <input type="hidden" name="missionId" value={p.id} />
                    <button className="min-h-touch w-full rounded-card bg-primary text-[0.82em] font-bold text-white">
                      {approveLabel}
                    </button>
                  </form>
                  {/* 🔴 거절은 사유를 함께 받는다. 사유 없이 보내면 아이 화면에서 「미실천」과 같아진다 */}
                  <form action={rejectMissionAction} className="grid gap-1">
                    <input type="hidden" name="missionId" value={p.id} />
                    <input name="reason" placeholder={reasonPlaceholder}
                           className="min-h-touch w-full rounded-card border border-line-2 bg-surface px-2 text-[0.74em]" />
                    <button className="min-h-touch w-full rounded-card border border-line-2 bg-surface text-[0.82em] text-ink-soft">
                      {rejectLabel}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
