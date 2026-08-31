-- 용돈 장부 — 어긋남 대장 D18
--
-- 🔴 **앱은 돈을 보관하지 않는다.** 실제 돈은 앱 밖(부모 카드·현금)에 있다.
--    여기는 「얼마 줬고 얼마 남았나」를 적는 **장부**다. 앱이 실제로 가치를 보관하면
--    선불전자지급수단이 되어 전자금융업 등록 대상이 된다 — 아동 명의까지 겹친다.
--
-- 🔴 **별과 절대 섞이지 않는다** (P-21 · REQ-NF-010 · S4).
--    별 원장(`star_ledger`)과 이 표 사이에 **어떤 전환 함수도 두지 않는다.**
--    별로 용돈을 살 수 없고, 용돈으로 별을 살 수 없다. 표가 둘인 이유가 그것이다.
--
-- 🔴 **잔액을 따로 저장하지 않는다.** 별 원장과 같은 규율이다 — 합이 잔액이다.

CREATE TYPE "activity"."AllowanceCode" AS ENUM (
  -- 보호자가 용돈을 줬다고 적는다 (+)
  'TOPUP',
  -- 아이가 목표에 떼어 두었다 (−)
  'WISH_SET_ASIDE',
  -- 목표를 지워 되돌렸다 (+)
  'WISH_RELEASE',
  -- 계획대로 쓴 것을 적었다 (−)
  'PLAN_SPEND',
  -- 보호자가 잘못 적은 것을 고쳤다 (±)
  'ADJUST'
);

CREATE TABLE "activity"."allowance_ledger" (
    "id"              UUID           NOT NULL,
    "child_id"        UUID           NOT NULL,
    "delta"           INTEGER        NOT NULL,
    "code"            "activity"."AllowanceCode" NOT NULL,
    -- 아이가 화면에서 읽을 한 줄 — 「엄마가 넣어 줌」 · 「물감 세트에 넣음」
    "memo"            TEXT,
    -- 🔴 같은 조작이 두 번 들어와도 한 번만 적힌다. 별 원장과 같은 규율 (REQ-NF-003)
    "idempotency_key" TEXT           NOT NULL,
    "balance_after"   INTEGER        NOT NULL,
    "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "allowance_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "allowance_ledger_idem_key" ON "activity"."allowance_ledger"("idempotency_key");
CREATE INDEX "allowance_ledger_child_created_idx" ON "activity"."allowance_ledger"("child_id", "created_at" DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."allowance_ledger" TO app_activity;
ALTER TABLE "activity"."allowance_ledger" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."allowance_ledger"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
