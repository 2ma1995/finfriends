-- 알림을 «미션 말고도» 담을 수 있게 — 1단계: 더하기 — 어긋남 대장 D75
--
-- 🔴 **이름을 바꾸지 않고 더한다.** 바꾸면 코드와 DB 가 어긋나는 순간이 반드시 생긴다.
--      DB 먼저 → 아직 `mission_id` 를 쓰는 배포본이 알림을 못 만든다
--                (미션 「했어요」와 24시간 리마인드가 죽는다)
--      코드 먼저 → 아직 `ref_id` 가 없는 DB 에서 알림이 못 만들어진다
--    한쪽을 먼저 놓을 수 없으면 **둘 다 있는 구간**을 만드는 것이 답이다.
--
-- 🔴 **여기서는 `NOT NULL` 로 못박지 않는다.** 지금 도는 배포본은 `ref_id` 를
--    채우지 않는다 — 못박으면 그 순간 «옛 코드가» 알림을 못 만든다.
--    새 코드가 자리를 잡은 뒤 2단계에서 못박고 옛 칸을 지운다.
--
-- 🔴 그래서 새 열쇠는 **부분 인덱스**다. `ref_id` 가 빈 줄(옛 코드가 만든 것)은
--    빼고 센다. 옛 열쇠가 그 줄들의 중복을 계속 막는다.

ALTER TABLE activity.notifications
  ADD COLUMN IF NOT EXISTS ref_id uuid;

-- 이미 있는 줄을 옮긴다. 대상이 없던 줄은 보호자 자신을 가리킨다
UPDATE activity.notifications
   SET ref_id = COALESCE(mission_id, guardian_id)
 WHERE ref_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_once_ref_idx
  ON activity.notifications (guardian_id, kind, ref_id)
  WHERE ref_id IS NOT NULL;
