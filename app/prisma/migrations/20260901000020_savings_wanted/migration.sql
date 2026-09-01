-- 아이가 바란 이자율 — 어긋남 대장 D25 보강
--
-- 🔴 **고르게 해놓고 무시하면 안 된다.** 아이에게 「고르게 해놓고 안 들어줌」은
--    신뢰를 깎는다. 그래서 「선택」이 아니라 **「제안」**으로 만든다 —
--    아이가 바라는 이자를 말하고, 보호자가 답한다. 무시가 아니라 대화가 된다.
--
-- 🔴 정하는 것은 여전히 **보호자**다. 이자는 보호자가 자기 돈으로 준다.
ALTER TABLE "activity"."savings_plans" ADD COLUMN "wanted_pct" INTEGER;

COMMENT ON COLUMN "activity"."savings_plans"."wanted_pct" IS
  '아이가 바란 이자율. 실제 적용은 interest_pct 이고 보호자가 정한다.';
