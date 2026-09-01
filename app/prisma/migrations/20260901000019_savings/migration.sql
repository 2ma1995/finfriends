-- 우리 집 적금 — 어긋남 대장 D25
--
-- 🔴 **외부 금융기관 가입을 중개하지 않는다** (P-20 · REQ-NF-012).
--    외부 가입 링크도, API 호출도 없다. 여기 있는 것은 **부모와 아이의 약속**이고
--    이자는 **부모가 자기 돈으로** 준다. 금융상품이 아니다.
--
-- 🔴 이게 「불리기」 실천을 여는 유일한 길이다. SRS 는 SAVINGS_JOINED(⭐1)와
--    SAVINGS_DONE(⭐10)을 정의해 뒀는데 **쓰는 곳이 없었다.** 그래서 불리기 나무가
--    자랄 방법이 없었다 (GRW-001: 불리기 주기 = 적금 시작~만기).

CREATE TYPE "activity"."SavingsState" AS ENUM (
  -- 아이가 신청했고 보호자를 기다린다
  'REQUESTED',
  -- 보호자가 받아들였다. 돈이 묶인다
  'ACTIVE',
  -- 만기까지 지켰다 — 원금 + 이자
  'DONE',
  -- 🔴 만기 전에 깼다. 원금만 돌아오고 **이자는 없다** — 자료가 가르치는 그대로다
  'BROKEN',
  'REJECTED'
);

CREATE TABLE "activity"."savings_plans" (
    "id"            UUID           NOT NULL,
    "child_id"      UUID           NOT NULL,
    "guardian_id"   UUID           NOT NULL,
    -- 아이가 왜 모으는지. 목표가 없으면 금방 깬다
    "goal"          TEXT           NOT NULL,
    "amount"        INTEGER        NOT NULL,
    "months"        INTEGER        NOT NULL,
    -- 🔴 **신청 시점 이자율을 박아 둔다.** 나중에 부모가 바꿔도 이 약속은 그대로다 —
    --    약속한 뒤에 조건이 바뀌면 그건 약속이 아니다
    "interest_pct"  INTEGER        NOT NULL DEFAULT 0,
    "state"         "activity"."SavingsState" NOT NULL DEFAULT 'REQUESTED',
    "requested_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at"    TIMESTAMPTZ(6),
    "matures_at"    TIMESTAMPTZ(6),
    "closed_at"     TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    CONSTRAINT "savings_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "savings_plans_amount_pos"  CHECK ("amount" > 0),
    CONSTRAINT "savings_plans_months_range" CHECK ("months" BETWEEN 1 AND 12)
);

CREATE INDEX "savings_child_state_idx"    ON "activity"."savings_plans"("child_id", "state");
CREATE INDEX "savings_guardian_state_idx" ON "activity"."savings_plans"("guardian_id", "state");

-- 🔴 한 번에 하나만 — 여러 개를 동시에 굴리면 아이가 무엇을 지키는지 모른다
CREATE UNIQUE INDEX "savings_one_open_per_child"
  ON "activity"."savings_plans"("child_id") WHERE "state" IN ('REQUESTED', 'ACTIVE');

-- 용돈 장부에 적금으로 묶고 푸는 코드를 더한다
ALTER TYPE "activity"."AllowanceCode" ADD VALUE IF NOT EXISTS 'SAVINGS_LOCK';
ALTER TYPE "activity"."AllowanceCode" ADD VALUE IF NOT EXISTS 'SAVINGS_RELEASE';

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."savings_plans" TO app_activity;
ALTER TABLE "activity"."savings_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."savings_plans"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
