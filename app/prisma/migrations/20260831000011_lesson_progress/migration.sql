-- 읽은 학습 편 — 어긋남 대장 D15
--
-- 🔴 `completed_count` 만 있어서 **진도를 올릴 방법이 없었다.** 올려도 같은 편을 다시
--    읽으면 또 오른다. 그래서 아무도 안 올렸고, 시드 값이 그대로 「3 / 3편」으로 보였다.
--    무엇을 읽었는지를 담아야 「다시 읽어도 안 오른다」가 성립한다.
ALTER TABLE "activity"."learning_progress"
  ADD COLUMN "completed_lessons" TEXT[] NOT NULL DEFAULT '{}';
