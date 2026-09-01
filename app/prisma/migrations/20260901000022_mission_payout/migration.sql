-- 미션 금액 — 어긋남 대장 D30
--
-- 🔴 `REQ-FUNC-002` 는 「보호자는 미션 조건과 **금액**을 사전 설정할 수 있어야 하며,
--    승인 시 ⭐1이 지급되고 실천 카운트에 가산되어야 한다」고 적었다.
--    **금액을 통째로 빠뜨렸다.** `reward` 를 별 개수로 읽고 용돈 경로를 안 만들었다.
--
-- 🔴 미션은 「벌기」의 실체다. 심부름을 하고 용돈을 받는 것이 아이가 겪는 **유일한
--    「버는」 경험**인데, 별만 주면 학습(`earn-3`: 「용돈은 내가 번 돈일까?」)과 어긋난다.
--
-- 🔴 별↔현금 전환이 아니다 (P-21). 보호자가 **일한 대가로 용돈을 주는 것**이고,
--    실제 돈은 앱 밖에서 오간다. 원장은 그 사실을 적을 뿐이다 (D18).

ALTER TABLE "activity"."missions"
  ADD COLUMN "payout_won" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "activity"."missions"
  ADD CONSTRAINT "missions_payout_range" CHECK ("payout_won" >= 0 AND "payout_won" <= 100000);

COMMENT ON COLUMN "activity"."missions"."payout_won" IS
  '보호자가 미션에 건 금액(원). 승인 시 용돈 원장에 들어간다. 0이면 별만 준다.';

-- 🔴 ⭐는 REQ-FUNC-002 가 **1로 못박았다.** 별로 값을 매기던 것을 금액으로 옮긴다
UPDATE "activity"."missions" SET "payout_won" = "reward" * 500 WHERE "payout_won" = 0 AND "reward" > 1;
UPDATE "activity"."missions" SET "reward" = 1 WHERE "reward" <> 1;
