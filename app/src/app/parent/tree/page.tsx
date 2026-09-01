import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { TreeArt } from "@/components/parent/TreeArt";
import { STAGE_LABEL, type Condition, type TreeSlotView } from "@/contracts/growth";
import { findChild } from "@/modules/consent";
import { getTreeView } from "@/modules/growth";
import { countUnread } from "@/modules/mission";
import { currentGuardian } from "@/lib/session/guardian-session";
import {
  alertsLabel, cycleNotice, emptyState, engineNotice, nextTitle, quarantineNotice,
  slotsTitle, stageNotice, stallNotice,
} from "./tree.fixture";

// GRW-003 · UX-002 · REQ-FUNC-001 — 보호자가 여는 첫 화면
export const metadata = { title: "성장 나무 · 핀프렌즈" };

function Gauge({ c }: { c: Condition }) {
  const done = c.current >= c.required;
  const pct = Math.min(100, Math.round((c.current / c.required) * 100));
  return (
    <li>
      <div className="flex items-baseline justify-between text-cap">
        <span className="text-ink-soft">{c.label}</span>
        <span className="tabular-nums text-ink-mute">{c.current}/{c.required}</span>
      </div>
      <div className="mt-0.5 h-[5px] overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? "var(--ff-primary-l)" : "var(--ff-miss-line)" }} />
      </div>
    </li>
  );
}

/**
 * 나무 한 칸.
 *
 * 🔴 **선은 「무슨 일이 있다」를 말할 때만 그린다.** 네 칸 모두 선을 두르면
 *    정체된 칸의 선이 **눈에 안 들어온다** — 다 두르면 아무것도 안 두른 것과 같다.
 *    묶는 것은 배경과 여백이고, 선은 뜻을 갖는다 (`Screen.Card` 와 같은 규칙).
 *
 * 🔴 **이름이 카드의 정체다.** `text-sub` 라 본문보다 작았다 —
 *    큰 것이 없어서 「이게 무슨 칸이었지」를 매번 다시 읽어야 했다.
 *    **값 자체가 카드의 내용일 때는 `text-body`** 다 (구역 제목 `text-title` 과
 *    게이지 `text-cap` 사이 단). 🔴 픽셀값을 여기 적지 않는다 —
 *    토큰이 바뀌면 주석만 남아 거짓이 된다. 실제로 오늘 한 번 바뀌었다.
 */
function TreeCard({ t }: { t: TreeSlotView }) {
  return (
    <div className={`rounded-card p-3 text-center ${t.stalledDays ? "border border-miss-line bg-miss-bg" : "bg-surface"}`}>
      <TreeArt stage={t.stage} icon={t.icon} />
      <div className="mt-1 text-body font-bold">{t.label}</div>
      <div className="text-cap text-ink-mute">
        {t.locked ? "곧 열려요" : t.stalledDays ? `${t.stalledDays}일째 그대로` : STAGE_LABEL[t.stage]}
      </div>
      {!t.locked && t.nextStageLabel ? (
        <div className="text-micro text-ink-mute">{t.nextStageLabel}</div>
      ) : null}
      <ul className="mt-2 grid gap-1 text-left">{t.conditions.map((c) => <Gauge key={c.label} c={c} />)}</ul>
      {/*
        🔴 **무엇이 모자라서 안 올랐는지 말한다** (`AC-030-2`).
           게이지만 보여주면 부모는 세 숫자를 읽고 **스스로 비교해야** 한다 —
           그건 「증거를 제시하고 판단을 돕는다」가 아니다.

        🔴 잠긴 칸에는 안 적는다. 열리지도 않은 것에 「남았어요」는 말이 안 된다.
      */}
      {!t.locked && t.blockedBy ? (
        <p className="mt-1.5 text-left text-micro leading-relaxed text-ink-soft">{t.blockedBy}</p>
      ) : null}
    </div>
  );
}

export default async function ParentTreePage() {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  // 🔴 아이가 없으면 볼 나무도 없다. 남의 예시 데이터를 보여주지 않는다
  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title="성장 나무">
        <Empty
          emoji="🐣"
          title="아직 등록한 아이가 없어요"
          body="아이 프로필을 만들면 네 영역의 나무가 함께 생깁니다."
          hint="온보딩 3단계 · 아이 프로필"
        />
        <Link
          href="/parent/child/new"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  const [view, unread] = await Promise.all([
    getTreeView(child.id, child.displayName),
    countUnread(guardian.guardianId),
  ]);

  return (
    <Screen role="부모 화면" title="성장 나무" sub={`${view.childName} · ${view.cycleLabel}`}>
      {/*
        🔴 **안 읽은 알림이 있을 때만 보인다.** 0이면 자리도 없다 —
           빈 배지를 늘 띄우면 아무도 안 본다.

        🔴 **맨 위다.** 주석에는 늘 「첫 화면 맨 위가 그 자리다」라고 적혀 있었는데
           실제로는 **아홉 덩어리 중 여섯 번째**에 그려지고 있었다 —
           `mb-2`(아래 여백)만 그 의도를 붙들고 있었다.
           푸시를 붙인 뒤에도(D56) 앱을 열어 확인하는 것이 주 경로다.
      */}
      {unread > 0 ? (
        <Link
          href="/parent/alerts"
          className="mb-3 flex min-h-touch items-center justify-between rounded-card border border-primary-l bg-primary-bg px-3 text-sub font-bold text-primary-d"
        >
          <span>🔔 {alertsLabel(unread)}</span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      {/*
        🔴 US-1 AC-E1 — 실천 0건이면 0으로 그리지 않는다.
           0% 로 그리면 보호자는 「변화가 없다」가 아니라 「고장났다」로 읽는다.
      */}
      {view.noActivity ? (
        <Empty emoji={emptyState.emoji} title={emptyState.title} body={emptyState.body} hint={emptyState.hint} />
      ) : (
        /* ② 4영역 2×2 — 순서를 바꾸지 않는다 (명세 §2.1) */
        <section>
          <h2 className="mb-2 mt-6 text-title font-bold leading-none">{slotsTitle}</h2>
          <div className="grid grid-cols-2 gap-2">
            {view.slots.map((t) => <TreeCard key={t.topic} t={t} />)}
          </div>
        </section>
      )}

      {/*
        🔴 **나무 칸 바로 뒤다.** 한동안 「미션 만들기」 **뒤**에 있었다 —
           문제를 보고 → 행동하고 → 나중에 설명을 읽는 순서가 되어 거꾸로였다.
           보고(칸) → 알고(이 안내) → 하고(다음 할 일)가 맞다.

        🔴 정체가 있으면 말한다 — 다만 **다그치지 않는다.**
           「14일째 그대로」만 있으면 부모는 아이를 재촉한다.
           무엇이 남았는지가 카드마다 적혀 있으니 거기를 가리킨다.
      */}
      {view.slots.some((s) => s.stalledDays !== null) ? (
        <div className="mt-3">
          {/* 🔴 여기는 선을 그린다 — 「무슨 일이 있다」이고 부모가 할 일이 있다 */}
          <Card tone="miss">
            <p className="text-sub leading-relaxed text-ink-soft">{stallNotice}</p>
          </Card>
        </div>
      ) : null}

      {/*
        ④ 다음 할 일 — 나무가 안 자란 것을 본 부모가 **할 수 있는 것**을 모은다.
           US-3 AC3 이 「정체 원인을 본 뒤 다음 주 재방문」을 요구하는데,
           볼 것만 주고 할 것을 주지 않으면 재방문할 이유가 없다.

        🔴 승인 대기와 미션 만들기는 **한 덩어리다.** 흩어져 있으면
           「무엇을 해야 하나」가 화면 여러 곳을 훑어야 나온다.
      */}
      <section>
        <h2 className="mb-2 mt-6 text-title font-bold leading-none">{nextTitle}</h2>

        {/* 🔴 조건부. 없으면 자리도 없다 — 「0건 대기」를 늘 띄우면 아무도 안 본다 */}
        {view.pendingApprovals > 0 ? (
          <Link
            href="/parent/bank/missions"
            className="mb-1.5 flex min-h-touch items-center justify-between rounded-card bg-sand px-3 text-sub text-ink-soft"
          >
            <span>승인을 기다리는 미션</span>
            <b className="text-miss">{view.pendingApprovals}건 →</b>
          </Link>
        ) : null}

        <Link
          href="/parent/bank/missions/new"
          className="flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-body font-bold text-white"
        >
          미션 만들기
        </Link>
      </section>

      {/*
        ⑤ 실천 근거 — 접지 않는다 (AC-1.2).
        🔴 지금은 근거를 만들 엔진(GRW-001)이 없다. 문장을 지어내지 않고 그 사실을 적는다.
      */}
      <div className="mt-3">
        <Card>
          <h2 className="text-cap tracking-[0.03em] text-ink-mute">{engineNotice.title}</h2>
          <p className="mt-1 text-sub leading-relaxed text-ink-soft">{engineNotice.body}</p>
        </Card>
      </div>

      {/*
        🔴 정합성이 깨진 줄이 있으면 숨기지 않는다 (AC-012-3).
           선을 두르지 않는다 — 드물고 **정보성**이다. 선은 부모가 할 일이 있을 때 쓴다.
      */}
      {view.quarantinedStars > 0 ? (
        <p className="mt-3 rounded-card bg-surface px-3 py-2 text-cap leading-relaxed text-ink-soft">
          {quarantineNotice(view.quarantinedStars)}
        </p>
      ) : null}

      {/* 🔴 매달 실천만 비워지는 이유를 적는다 — 안 적으면 「쉽게 올랐다」로 읽힌다 */}
      <p className="mt-3 text-micro leading-relaxed text-ink-mute">{cycleNotice}</p>
      <p className="mt-1 text-micro leading-relaxed text-ink-mute">{stageNotice}</p>
    </Screen>
  );
}
