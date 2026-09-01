import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYOUT_MAX, TITLE_MAX } from "@/contracts/mission";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { findChild } from "@/modules/consent";
import { listOpenForGuardian } from "@/modules/mission";
import { createMissionAction } from "@/app/actions/parent-mission";
import { currentGuardian } from "@/lib/session/guardian-session";
import { examples, hints, photoRule } from "./new-mission.fixture";

// PRC-001 — 미션 만들기. §6.1 진입점 4번 `createMission`
export const metadata = { title: "미션 만들기 · 핀프렌즈" };

/** 🔴 「불리기」는 실천 경로가 닫혀 있어 미션을 열지 않는다 (F15 · P-20) */
/**
 * 🔴 **미션은 「벌기」 하나다** (사용자 결정 2026-09-01 · 어긋남 대장 D50).
 *
 *    미션은 **심부름하고 용돈을 받는 일**이다 — 아이가 겪는 유일한 「버는」 경험이고,
 *    그래서 실천이 붙을 자리도 벌기뿐이다.
 *
 *    나머지 영역은 **각자의 실천 경로가 이미 있다.** 미션으로 겹쳐 열면
 *    같은 일을 두 곳에서 세게 되고, 부모가 어느 쪽으로 걸어야 할지 모른다.
 *
 *    | 영역 | 실천을 여는 것 |
 *    | 잘 쓰기 | 계획 카드 ↔ 실제 대조 (`FR-020` 이전 방식) |
 *    | 모으기 | 위시리스트 30 · 70 · 100% (`REQ-FUNC-012`) |
 *    | 불리기 | 우리 집 적금 (`D25`) |
 */
const OPENABLE: readonly Topic[] = ["EARN"];

export default async function NewMissionPage({
  searchParams,
}: {
  // 🔴 `topic` 은 되채울 것이 없다 — 미션은 「벌기」뿐이라 고를 것이 없다 (D50)
  searchParams: Promise<{ error?: string; title?: string; payoutWon?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title="미션 만들기" back={{ href: "/parent/bank/missions", label: "승인 대기" }}>
        <Empty
          emoji="🐣"
          title="등록한 아이가 없어요"
          body="아이 프로필을 먼저 만들면 미션을 줄 수 있어요."
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

  const { error, title, payoutWon } = await searchParams;
  const open = await listOpenForGuardian(guardian.guardianId);

  return (
    <Screen
      role="부모 화면"
      title="미션 만들기"
      sub={`${child.displayName}에게 줄 미션`}
      back={{ href: "/parent/bank/missions", label: "승인 대기" }}
    >
      <form action={createMissionAction} className="grid gap-2.5">
        <div className="grid gap-1">
          <Label htmlFor="title" className="text-sub font-normal text-ink-soft">
            무엇을 하면 되나요
          </Label>
          <Input
            id="title"
            name="title"
            type="text"
            required
            maxLength={TITLE_MAX}
            defaultValue={title}
            placeholder="예: 장 볼 때 가격표 두 개 비교하기"
            className="min-h-touch rounded-card border-line bg-surface px-3 text-body text-ink placeholder:text-ink-mute"
          />
          <small className="text-cap leading-relaxed text-ink-mute">{hints.title}</small>
        </div>

        {/*
          🔴 **고를 것이 하나면 묻지 않는다.** 라디오 하나만 있는 선택지는
             「다른 것도 있나」를 묻게 만들고, 실제로는 없다.
             값은 hidden 으로 넘기고 화면은 **무엇으로 셀지 알려주기만** 한다.
        */}
        <fieldset className="grid gap-1">
          <legend className="mb-1 text-sub text-ink-soft">무엇으로 셀까요</legend>
          <div className="grid gap-1">
            {OPENABLE.map((t) => (
              <div
                key={t}
                className="flex items-start gap-2 rounded-card border border-primary-l bg-primary-bg px-3 py-2"
              >
                {/* 🔴 서버가 다시 검사한다 — hidden 은 폼을 우회하면 아무 값이나 올 수 있다 */}
                <input type="hidden" name="topic" value={t} />
                <span className="flex-1 text-sub leading-relaxed">
                  <b>{TOPIC_ICON[t]} {TOPIC_LABEL[t]}</b>
                  <br />
                  <small className="text-sub text-ink-soft">{examples[t]}</small>
                </span>
              </div>
            ))}
          </div>
          <small className="text-cap leading-relaxed text-ink-mute">{hints.topic}</small>
          {/* 🔴 걸기 전에 말한다 — 찍을 수 없는 일을 벌기로 걸면 아이가 올릴 방법이 없다 (D49) */}
          <small className="mt-1 block rounded-card border border-line-2 bg-surface px-2.5 py-2 text-cap leading-relaxed text-ink-soft">
            📷 {photoRule}
          </small>
        </fieldset>

        {/* 🔴 `REQ-FUNC-002` — 보호자가 정하는 것은 **금액**이다. ⭐는 1로 못박혀 있다.
            미션은 「벌기」의 실체다 — 심부름하고 용돈을 받는 것이 아이가 겪는
            유일한 「버는」 경험이다 */}
        <div className="grid gap-1">
          <Label htmlFor="payoutWon" className="text-sub font-normal text-ink-soft">
            해내면 줄 용돈
          </Label>
          <Input
            id="payoutWon"
            name="payoutWon"
            type="number"
            inputMode="numeric"
            min={0}
            max={PAYOUT_MAX}
            step={100}
            defaultValue={payoutWon ?? "1000"}
            className="min-h-touch rounded-card border-line bg-surface px-3 text-right text-body tabular-nums text-ink"
          />
          <small className="text-cap leading-relaxed text-ink-mute">{hints.payout}</small>
        </div>

        <div className="mt-0.5">
          <Card tone="grow">
            <h2 className="text-cap tracking-[0.03em] text-primary-d">{hints.approvalTitle}</h2>
            <p className="mt-1 text-sub leading-relaxed text-ink-soft">{hints.approvalBody}</p>
          </Card>
        </div>

        {error ? (
          <p className="rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-sub leading-relaxed text-miss">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="min-h-touch w-full rounded-card bg-primary text-body font-bold text-white"
        >
          미션 만들기
        </button>
      </form>

      {open.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-cap tracking-[0.06em] text-ink-mute">
            아직 안 한 미션 {open.length}개
          </h2>
          <ul className="mt-1.5 grid gap-1">
            {open.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-2 rounded-card border border-line bg-surface px-3 py-2">
                <span className="flex-1 text-sub leading-relaxed text-ink-soft">
                  {m.icon} {m.title}
                </span>
                <b className="shrink-0 text-sub text-star-d">⭐ {m.reward}</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Screen>
  );
}
