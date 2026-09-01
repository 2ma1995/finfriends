-- 미션 사진 — `FR-032` · 어긋남 대장 D31
--
-- 🔴 **이전 문서에서는 범위 밖이었다** — 「미션 사진 인증 · 퍼핀 동일 기능 + 아동 이미지
--    리스크」로 제외됐다. 새 문서(10.SRS v1.0)는 **「판정 즉시 파기 · 스토리지 스캔 0건」**
--    을 조건으로 붙여 다시 넣었다. 사용자 확인을 받았다(2026-09-01).
--
-- 🔴 **이미지를 DB 에 넣지 않는다.** 여기 있는 것은 **참조 하나**뿐이고,
--    판정하는 순간 지운다(AC-032-1). 파기 시각을 남겨 **스캔 0건(AC-032-2)을
--    사후에 증명**할 수 있게 한다.
--
-- 🔴 파기는 **미룰 수 없다.** 배치로 돌리면 「아직 안 지워진 창」이 생기고,
--    그 창이 아동 이미지가 남아 있는 시간이다.

ALTER TABLE "activity"."missions"
  -- 저장소의 객체 키. 판정하면 즉시 null 이 된다
  ADD COLUMN "photo_key"     TEXT,
  ADD COLUMN "photo_added_at" TIMESTAMPTZ(6),
  -- 🔴 언제 지웠는지. 「지웠다」를 기록으로 증명한다
  ADD COLUMN "photo_erased_at" TIMESTAMPTZ(6);

-- 🔴 판정이 끝난 미션에 사진이 남아 있으면 안 된다 (AC-032-2).
--    코드가 실수해도 DB 가 막는다
ALTER TABLE "activity"."missions" ADD CONSTRAINT "missions_photo_erased_after_decision" CHECK (
  "decided_at" IS NULL OR "photo_key" IS NULL
);

COMMENT ON COLUMN "activity"."missions"."photo_key" IS
  '저장소 객체 키. 판정 즉시 null 로 지운다 — 아동 이미지는 남기지 않는다 (FR-032).';
