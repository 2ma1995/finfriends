-- 카드 거래 내역 — 어긋남 대장 D19
--
-- 🔴 **아직 실제 연동이 아니다.** `source = MOCK` 인 줄만 들어온다.
--    실제 연동(`DAT-004`)은 제휴 카드사가 발급하고 **자금은 카드사가 보관**한다 —
--    앱은 내역만 받는다. 그래야 D18 의 선(앱은 돈을 보관하지 않는다)이 유지된다.
--
-- 🔴 **손입력을 대체하지 않는다.** 아이가 스스로 적는 것이 학습이고, 카드 내역은
--    **대조용**이다. 적은 금액과 실제가 다를 때 그 차이를 보는 것이 좋은 학습 장면이다.

CREATE TYPE "activity"."TxnSource" AS ENUM ('MOCK', 'LINKED');

CREATE TABLE "activity"."card_transactions" (
    "id"           UUID           NOT NULL,
    "child_id"     UUID           NOT NULL,
    "amount"       INTEGER        NOT NULL,
    "merchant"     TEXT           NOT NULL,
    -- 업종. 계획 카드와 같은 사전을 쓴다
    "category"     TEXT           NOT NULL,
    "occurred_at"  TIMESTAMPTZ(6) NOT NULL,
    -- 🔴 어디서 온 줄인가. 화면이 「예시」임을 밝혀야 한다
    "source"       "activity"."TxnSource" NOT NULL DEFAULT 'MOCK',
    -- 이 거래를 어느 지출 기록에 붙였나. null 이면 아직 안 맞춰본 것
    "record_id"    UUID,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "card_transactions_pkey" PRIMARY KEY ("id")
);

-- 🔴 한 거래는 한 번만 쓰인다. 같은 거래로 두 계획을 맞춰 별을 두 번 받을 수 없다
CREATE UNIQUE INDEX "card_txn_record_key" ON "activity"."card_transactions"("record_id") WHERE "record_id" IS NOT NULL;
CREATE INDEX "card_txn_child_idx" ON "activity"."card_transactions"("child_id", "occurred_at" DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."card_transactions" TO app_activity;
ALTER TABLE "activity"."card_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."card_transactions"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
