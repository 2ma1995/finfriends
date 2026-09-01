-- 결제에 MCC 를 싣는다 — `FR-021` · `DAT-004` · 어긋남 대장 D34
--
-- 🔴 실제 카드는 **가맹점 업종 코드(MCC · ISO 18245)** 를 보낸다. 지금까지는 우리 업종
--    4종을 예시 거래에 직접 박아 넣었는데, 그건 **실제 입력이 아니다.**
--    웹훅이 붙었을 때 바꿀 코드를 줄이려면 지금부터 MCC 를 받아 우리 업종으로 접어야 한다.
--
-- 🔴 `category` 는 **접은 결과**다. MCC 를 알면 거기서 계산하고, 모르면 미분류다.

ALTER TABLE "activity"."card_transactions" ADD COLUMN "mcc" TEXT;
ALTER TABLE "activity"."envelope_spends"   ADD COLUMN "mcc" TEXT;

COMMENT ON COLUMN "activity"."card_transactions"."mcc" IS
  '가맹점 업종 코드(ISO 18245). 실제 카드가 보내는 값. category 는 이걸 접은 결과다.';
