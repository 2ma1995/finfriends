-- 미션 사진 저장표 — FR-032 · 어긋남 대장 D32.
--
-- 🔴 번호가 23 도 24 도 아니라 25 다. 아이 화면 세션이 같은 시각에 같은 이름(`..23_mission_photo`)으로
--    **파일 저장 방식**을 만들어 이미 적용했고, 이름까지 같아 병합에서 충돌한다.
--    그쪽이 자기 것을 되돌리기로 했고 이 표가 남는다 — 번호를 비켜 준다.
--
-- 🔴 **판정과 함께 사라지는 표다.** 승인·반려 즉시, 그리고 72시간 만료에서 지운다.
--    AC-032-2 의 검증이 「스토리지 스캔 0건」이라 파기를 셀 수 있어야 한다.
--
-- 🔴 이전 사양에서는 미션 사진이 **제외**였다(아동 이미지 리스크).
--    새 SRS 가 「판정 즉시 파기」를 조건으로 달아 다시 넣었고 사용자가 승인했다.
--
-- 🔴 mission_id 를 PK 로 둔다 — 미션 하나에 사진 하나. 재업로드는 덮어쓰기다.
--    여러 장을 허용하면 「한 장만 보고 지운다」는 파기 규칙이 흐려진다.

CREATE TABLE IF NOT EXISTS activity.mission_photos (
  mission_id  uuid PRIMARY KEY,
  bytes       bytea       NOT NULL,
  mime        text        NOT NULL,
  byte_size   integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 만료 배치가 오래된 것을 훑는다
CREATE INDEX IF NOT EXISTS mission_photos_created_at_idx
  ON activity.mission_photos (created_at);
