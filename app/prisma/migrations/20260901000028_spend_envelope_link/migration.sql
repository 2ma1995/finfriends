-- 소비 기록에 봉투를 잇는다 — `FR-021` · 어긋남 대장 D32
--
-- 🔴 **`plan_card_id` · `category_match` 를 지우지 않는다.** 계획 카드로 만든 옛 기록이
--    이미 DB 에 있고, 부모 소비 내역이 그 세 값으로 문구를 고른다. 지우면 그 화면이 깨진다.
--    **봉투 칸을 더한다** — 새 기록은 봉투로, 옛 기록은 계획으로 읽는다.

ALTER TABLE "activity"."spending_records"
  ADD COLUMN "envelope_id"   UUID,
  -- 🔴 결제 시각 기준 판정. 사후 봉투 수정은 소급되지 않는다 (AC-021-3)
  ADD COLUMN "envelope_over" INTEGER,
  ADD COLUMN "unclassified"  BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "spending_envelope_idx" ON "activity"."spending_records"("envelope_id");

COMMENT ON COLUMN "activity"."spending_records"."envelope_over" IS
  '봉투를 넘긴 금액(원). 0이면 봉투 안. null 이면 봉투 이전(계획 카드) 기록.';

-- 봉투에 「언제 배분했는지」를 남긴다. 잔액은 **배분 이후의 지출**만 센다 —
-- 안 그러면 다시 충전해 배분해도 지난달 지출이 계속 깎는다
ALTER TABLE "activity"."envelopes"
  ADD COLUMN "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
