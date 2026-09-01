import Link from "next/link";
import type { MissionView } from "@/contracts/mission";

/**
 * 오늘 할 일 — 🔴 **링크 목록이 아니라 남은 일 목록이다.**
 *
 * 예전엔 「부모님이 준 미션 · 쓸 계획 적기 · 실천하기 · 갖고 싶은 것」 네 줄이
 * **늘 똑같이** 있었다. 할 게 있든 없든 같은 화면이라 **아이는 넷을 다 눌러 봐야**
 * 오늘 뭐가 남았는지 알 수 있었다. 그건 할 일 목록이 아니라 메뉴다.
 *
 * 🔴 **미션은 카드로 보여준다.** 「미션 있음」이 아니라 **무엇을 하면 되는지**를
 *    제목으로 읽게 한다 — 「신발 정리」를 보고 가는 것과 「미션」을 보고 가는 것은 다르다.
 *
 * 🔴 **다 했으면 그렇다고 말한다.** 빈 목록은 고장으로 읽힌다.
 */
export type TodayItem = {
  readonly href: string;
  readonly emoji: string;
  readonly label: string;
  readonly note?: string;
};

export function TodayList({
  title, missions, items, allDone, missionMore, won,
}: {
  title: string;
  missions: readonly MissionView[];
  items: readonly TodayItem[];
  allDone: string;
  /** 🔴 `{n}` 은 화면에 안 그린 미션 수 */
  missionMore: string;
  won: (n: number) => string;
}) {
  const nothing = missions.length === 0 && items.length === 0;
  const shown = missions.slice(0, 2);
  const rest = missions.length - shown.length;

  return (
    <>
      <h2 className="mb-2 mt-6 text-title font-bold leading-none">{title}</h2>

      {nothing ? (
        <p className="rounded-card border border-dashed border-line-2 px-3 py-3 text-center text-sub text-ink-mute">
          {allDone}
        </p>
      ) : null}

      <ul className="grid gap-1">
        {/* 🔴 **미션은 카드다.** 무엇을 하면 되는지가 제목으로 보여야 간다 */}
        {shown.map((m) => (
          <li key={m.id}>
            {/*
              🔴 **제일 큰 것이 오늘 할 일이다.** 예전엔 미션 제목이 본문과 같은 크기라
                 화면에서 무엇이 급한지 안 보였고, 구분은 **테두리 하나**뿐이었다 —
                 그런데 테두리는 **모든 것에 있었다.** 선을 걷고 크기와 여백으로 세운다.
            */}
            <Link href="/child/missions" className="block rounded-card bg-primary-bg px-4 py-3.5">
              <span className="block text-cap font-bold text-primary-d">
                {m.icon} {m.topicLabel}
              </span>
              <b className="mt-1 block truncate text-title leading-tight">{m.title}</b>
              <span className="mt-1.5 block text-sub">
                {m.payoutWon > 0 ? (
                  <b className="text-primary-d">{won(m.payoutWon)}</b>
                ) : null}
                <span className="text-star-d">{m.payoutWon > 0 ? " · " : ""}⭐ {m.reward}</span>
              </span>
            </Link>
          </li>
        ))}

        {rest > 0 ? (
          <li>
            <Link href="/child/missions"
                  className="flex min-h-touch items-center justify-center rounded-card text-sub text-ink-soft">
              {missionMore.replace("{n}", String(rest))}
            </Link>
          </li>
        ) : null}

        {/* 🔴 **남은 것만** 줄로 남는다. 없으면 아예 안 그린다 */}
        {items.map((t) => (
          <li key={t.href}>
            {/* 🔴 **선을 긋지 않는다.** 68개 상자가 다 같은 무게였다 —
                   묶는 것은 여백이고, 배경은 누를 수 있다는 신호만 준다 */}
            <Link href={t.href}
                  className="flex min-h-touch items-center gap-2.5 rounded-card bg-surface px-3.5 text-body">
              <span className="text-[1.2em]">{t.emoji}</span>
              <span className="flex-1">{t.label}</span>
              {t.note ? <span className="text-cap text-ink-mute">{t.note}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
