-- 72시간 뒤 자동 완료 + 보호자 알림함 — 어긋남 대장 D51 (2026-09-01 사용자 결정).
--
-- 🔴 전에는 72시간이 지나면 EXPIRED 였다 — 별도 실천도 없었다.
--    이제 AUTO_APPROVED 로 **완료**되고 ⭐1 이 나간다.
--
-- 🔴 APPROVED 와 **구별해서** 둔다. 「누가 인정했나」가 이 제품의 근거이고
--    WPA 지표가 practice_credits.approval_mode 를 본다. 한 값으로 합치면
--    부모가 실제로 본 것과 그냥 시간이 지난 것을 가릴 수 없다.
--
-- 🔴 EXPIRED 는 지우지 않는다. Postgres 는 enum 값을 못 지우고,
--    이미 만료된 행이 있으면 그 표를 읽을 수 없게 된다.

ALTER TYPE activity."ApprovalState" ADD VALUE IF NOT EXISTS 'AUTO_APPROVED';

-- 보호자 알림함.
-- 🔴 인앱이다 — 웹푸시·메일·알림톡이 없다. 부모가 앱을 열어야 본다.
--    발송 채널이 붙으면 보낼 대상이 그대로 이 표가 된다.
-- 🔴 같은 일로 두 번 알리지 않는다. 화면을 열 때마다 판정하므로 막지 않으면 쌓인다.
CREATE TABLE IF NOT EXISTS activity.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid        NOT NULL,
  kind        text        NOT NULL,
  mission_id  uuid,
  title       text        NOT NULL,
  body        text        NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_once_idx
  ON activity.notifications (guardian_id, kind, mission_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON activity.notifications (guardian_id, read_at);
