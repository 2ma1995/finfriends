import Link from "next/link";
import { redirect } from "next/navigation";
import { Screen, Card, Empty } from "@/components/shared/Screen";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REWARD_MAX, REWARD_MIN, TITLE_MAX } from "@/contracts/mission";
import { TOPIC_ICON, TOPIC_LABEL, type Topic } from "@/contracts/learning";
import { findChild } from "@/modules/consent";
import { listOpenForGuardian } from "@/modules/mission";
import { createMissionAction } from "@/app/actions/parent-mission";
import { currentGuardian } from "@/lib/session/guardian-session";
import { examples, hints } from "./new-mission.fixture";

// PRC-001 — 미션 만들기. §6.1 진입점 4번 `createMission`
export const metadata = { title: "미션 만들기 · 핀프렌즈" };

/** 🔴 「불리기」는 실천 경로가 닫혀 있어 미션을 열지 않는다 (F15 · P-20) */
const OPENABLE: readonly Topic[] = ["EARN", "SPEND", "SAVE"];

export default async function NewMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; title?: string; topic?: string; reward?: string }>;
}) {
  const guardian = await currentGuardian();
  if (!guardian) redirect("/login");
  if (!guardian.consentCompleted) redirect("/consent");

  const child = await findChild(guardian.guardianId);
  if (!child) {
    return (
      <Screen role="부모 화면" title="미션 만들기" back={{ href: "/parent/missions", label: "미션" }}>
        <Empty
          emoji="🐣"
          title="등록한 아이가 없어요"
          body="아이 프로필을 먼저 만들면 미션을 줄 수 있어요."
          hint="온보딩 3단계 · 아이 프로필"
        />
        <Link
          href="/parent/child/new"
          className="mt-3 flex min-h-touch w-full items-center justify-center rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          아이 프로필 만들기
        </Link>
      </Screen>
    );
  }

  const { error, title, topic, reward } = await searchParams;
  const open = await listOpenForGuardian(guardian.guardianId);

  return (
    <Screen
      role="부모 화면"
      title="미션 만들기"
      sub={`${child.displayName}에게 줄 미션`}
      back={{ href: "/parent/missions", label: "미션" }}
    >
      <form action={createMissionAction} className="grid gap-2.5">
        <div className="grid gap-1">
          <Label htmlFor="title" className="text-[0.8em] font-normal text-ink-soft">
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
            className="min-h-touch rounded-card border-line bg-surface px-3 text-[0.9em] text-ink placeholder:text-ink-mute"
          />
          <small className="text-[0.74em] leading-relaxed text-ink-mute">{hints.title}</small>
        </div>

        <fieldset className="grid gap-1">
          <legend className="mb-1 text-[0.8em] text-ink-soft">어느 영역의 실천으로 셀까요</legend>
          <div className="grid gap-1">
            {OPENABLE.map((t) => (
              <label
                key={t}
                htmlFor={`topic-${t}`}
                className="flex min-h-touch cursor-pointer items-start gap-2 rounded-card border border-line bg-surface px-3 py-2"
              >
                <input
                  id={`topic-${t}`}
                  name="topic"
                  type="radio"
                  value={t}
                  required
                  defaultChecked={topic === t}
                  className="mt-1 size-4 shrink-0 accent-[var(--ff-primary)]"
                />
                <span className="flex-1 text-[0.84em] leading-relaxed">
                  {TOPIC_ICON[t]} {TOPIC_LABEL[t]}
                  <br />
                  <small className="text-[0.86em] text-ink-mute">{examples[t]}</small>
                </span>
              </label>
            ))}
          </div>
          <small className="text-[0.74em] leading-relaxed text-ink-mute">{hints.topic}</small>
        </fieldset>

        <div className="grid gap-1">
          <Label htmlFor="reward" className="text-[0.8em] font-normal text-ink-soft">
            해내면 줄 별
          </Label>
          <Input
            id="reward"
            name="reward"
            type="number"
            inputMode="numeric"
            required
            min={REWARD_MIN}
            max={REWARD_MAX}
            defaultValue={reward ?? "1"}
            className="min-h-touch rounded-card border-line bg-surface px-3 text-[0.9em] tabular-nums text-ink"
          />
          <small className="text-[0.74em] leading-relaxed text-ink-mute">{hints.reward}</small>
        </div>

        <div className="mt-0.5">
          <Card tone="grow">
            <h2 className="text-[0.76em] tracking-[0.03em] text-primary-d">{hints.approvalTitle}</h2>
            <p className="mt-1 text-[0.84em] leading-relaxed text-ink-soft">{hints.approvalBody}</p>
          </Card>
        </div>

        {error ? (
          <p className="rounded-card border border-miss-line bg-miss-bg px-3 py-2 text-[0.82em] leading-relaxed text-miss">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="min-h-touch w-full rounded-card bg-primary text-[0.9em] font-bold text-white"
        >
          미션 만들기
        </button>
      </form>

      {open.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-[0.74em] tracking-[0.06em] text-ink-mute">
            아직 안 한 미션 {open.length}개
          </h2>
          <ul className="mt-1.5 grid gap-1">
            {open.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-2 rounded-card border border-line bg-surface px-3 py-2">
                <span className="flex-1 text-[0.82em] leading-relaxed text-ink-soft">
                  {m.icon} {m.title}
                </span>
                <b className="shrink-0 text-[0.78em] text-star-d">⭐ {m.reward}</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Screen>
  );
}
