-- 예금과 적금을 가른다 — 어긋남 대장 D25 보강
--
-- 🔴 **이름을 잘못 붙였다.** 처음 만든 것은 목돈을 한 번에 묶는 **예금**인데
--    「적금」이라고 불렀다. 학습 `save-3` 이 둘을 구별해 가르치는데
--    앱이 반대로 말하면 배운 것이 무너진다.
--
-- 🔴 **적금이 저학년에게 더 맞는다.** 아이에게 목돈이 없다. 자료도 「조금씩 자주」를
--    강조한다(`save-2`: 하루 100원이면 한 달 3,000원). 그리고 **매주 넣는 행동 자체가
--    실천**이다 — 한 번 묶고 끝나면 3달 동안 아무 일도 일어나지 않는다.

CREATE TYPE "activity"."SavingsKind" AS ENUM (
  -- 목돈을 한 번에 넣고 만기까지 둔다
  'DEPOSIT',
  -- 매주 조금씩 넣는다. 🔴 **아이가 직접 넣는다** — 자동이면 실천이 아니다
  'INSTALLMENT'
);

ALTER TABLE "activity"."savings_plans"
  ADD COLUMN "kind"        "activity"."SavingsKind" NOT NULL DEFAULT 'DEPOSIT',
  -- 적금일 때 한 회에 넣는 금액
  ADD COLUMN "per_period"  INTEGER,
  -- 적금일 때 넣어야 하는 총 회차 (주 단위)
  ADD COLUMN "periods"     INTEGER,
  -- 지금까지 넣은 회차
  ADD COLUMN "paid_count"  INTEGER NOT NULL DEFAULT 0,
  -- 마지막으로 넣은 시각 — 「이번 주에 이미 넣었나」를 본다
  ADD COLUMN "last_paid_at" TIMESTAMPTZ(6);

-- 🔴 적금은 회차 정보가 있어야 하고, 예금은 없어야 한다. 섞이면 만기 금액을 못 센다
ALTER TABLE "activity"."savings_plans" ADD CONSTRAINT "savings_kind_shape" CHECK (
  (kind = 'DEPOSIT'     AND per_period IS NULL AND periods IS NULL)
  OR
  (kind = 'INSTALLMENT' AND per_period > 0 AND periods BETWEEN 2 AND 52)
);
