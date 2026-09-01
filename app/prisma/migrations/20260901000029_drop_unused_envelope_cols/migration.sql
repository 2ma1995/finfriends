-- 안 쓰는 봉투 컬럼 되돌리기 — 어긋남 대장 D34
--
-- 🔴 `spending_records` 에 봉투 칸을 더했는데 **아무도 안 쓴다.**
--    봉투 결제는 `envelope_spends` 에 쌓이기 때문이다. 두 표에 같은 뜻의 칸이 있으면
--    다음 사람이 「어느 쪽이 진짜지」를 묻는다 — 잔액에서 세 번 겪은 것과 같은 모양이다.
--
-- 🔴 **`spending_records` 자체는 남긴다.** 계획 카드로 만든 옛 기록이 들어 있고
--    부모 소비 내역이 그것을 읽는다. 쓰기만 멈춘다.

ALTER TABLE "activity"."spending_records"
  DROP COLUMN IF EXISTS "envelope_id",
  DROP COLUMN IF EXISTS "envelope_over",
  DROP COLUMN IF EXISTS "unclassified";
