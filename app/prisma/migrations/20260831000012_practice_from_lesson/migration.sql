-- 학습에서 시작한 실천 — 어긋남 대장 D16
--
-- 🔴 퀴즈를 틀리면 별을 못 받는다. 그런데 **그걸로 끝이면 배운 게 없다.**
--    「배운 걸 해보면 별을 받을 수 있다」가 이 제품의 규칙이다 —
--    별이 지식이 아니라 **행동**에 붙어야 한다.
--
-- 🔴 아이가 스스로 시작한 실천도 **보호자가 승인해야** 별이 된다.
--    아이가 자기 실천을 스스로 인정하면 실천 인정 자체가 무의미해진다.
--
-- `source_id` 는 학습 편 id. 보호자가 만든 미션은 null 이다 — 이 한 칸으로
-- 「부모가 준 미션」과 「아이가 배우고 스스로 한 것」을 화면에서 갈라 보여준다.
ALTER TABLE "activity"."missions" ADD COLUMN "source_id" TEXT;

-- 🔴 한 편당 한 장. 두 번 눌러도 승인 대기가 두 줄로 늘지 않는다.
--    거절된 것은 같은 줄을 되살려 다시 신청한다 — 아이에게 두 번째 기회를 준다
CREATE UNIQUE INDEX "missions_child_source_key"
  ON "activity"."missions"("child_id", "source_id") WHERE "source_id" IS NOT NULL;
