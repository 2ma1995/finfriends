-- 가맹점 분류 교정 — `FR-021` 예외 ② · 어긋남 대장 D34
--
-- 🔴 **MCC 표만으로는 90%(NFR-024)를 못 채운다.** 코드값은 표준이지만
--    **어느 가게에 어느 코드가 붙는지는 매입사가 정한다** — 같은 문구점이
--    `5943` 일 수도 `5399` 일 수도 있다. 표를 아무리 다듬어도 오분류는 남는다.
--
-- 🔴 **사람이 한 번 본 것이 코드보다 낫다.** 보호자가 고친 것을 기억해
--    다음부터 그 가게는 그 봉투에서 뺀다.
--
-- 🔴 **지난 결제에는 소급하지 않는다.** 옮기면 그 봉투 잔액이 바뀌고
--    **이미 내린 ⭐ 판정이 흔들린다** (`AC-021-3` 과 같은 이유).

CREATE TABLE "activity"."merchant_rules" (
    "child_id"   UUID           NOT NULL,
    -- 🔴 지금은 **가맹점 이름**이 키다. 실제 카드는 가맹점 ID 를 주고
    --    같은 브랜드도 지점마다 이름이 다르므로, 제휴가 붙으면 키를 ID 로 바꿔야 한다
    "merchant"   TEXT           NOT NULL,
    "category"   TEXT           NOT NULL,
    -- 무엇을 보고 정했는지 — 나중에 표를 고칠 때 근거가 된다
    "seen_mcc"   TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchant_rules_pkey" PRIMARY KEY ("child_id", "merchant")
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."merchant_rules" TO app_activity;
ALTER TABLE "activity"."merchant_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."merchant_rules"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
