-- 웹 푸시 구독 — 어긋남 대장 D56.
--
-- 🔴 알림이 **앱 안에서만** 보였다(D51). 부모가 앱을 열어야 알게 되니
--    「24시간 리마인드」의 실효가 없었다. 웹 푸시로 앱 밖으로 내보낸다.
--
-- 🔴 **보호자 것만이다.** 아이 기기에 푸시를 보내지 않는다 —
--    알림은 부모가 판정하라고 보내는 것이다.
--
-- 🔴 **기기마다 한 줄.** 부모가 폰과 태블릿을 같이 쓰면 둘 다 받아야 한다.
--    endpoint 가 그 기기를 가리키는 유일한 값이라 unique 로 둔다 —
--    같은 기기가 다시 구독하면 갱신이지 새 줄이 아니다.
--
-- 🔴 identity 에 둔다. 보호자 기기 정보이고 아이 활동과 조인하지 않는다 (REQ-NF-009).

CREATE TABLE IF NOT EXISTS identity.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id  uuid        NOT NULL,
  endpoint     text        NOT NULL UNIQUE,
  p256dh       text        NOT NULL,
  auth         text        NOT NULL,
  last_sent_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_guardian_idx
  ON identity.push_subscriptions (guardian_id);
