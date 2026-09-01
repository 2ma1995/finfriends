-- 미션 사진 컬럼 되돌리기 — 어긋남 대장 D31
--
-- 🔴 파일 저장 방식을 걷어낸다. **Vercel 은 쓰기 가능한 파일시스템이 없다** —
--    로컬에서만 되고 배포하면 업로드가 통째로 죽는다.
--    사진은 `activity.mission_photos`(별도 표)가 맡는다.
--
-- 🔴 `photo_erased_at` 은 **남긴다.** 표에서 행이 사라지면 증명이 「없다」뿐인데,
--    아동 이미지는 사고가 나면 **「언제 지웠다」**를 말할 수 있어야 한다.

ALTER TABLE "activity"."missions" DROP CONSTRAINT IF EXISTS "missions_photo_erased_after_decision";
ALTER TABLE "activity"."missions" DROP COLUMN IF EXISTS "photo_key";
ALTER TABLE "activity"."missions" DROP COLUMN IF EXISTS "photo_added_at";
-- photo_erased_at 은 유지한다
