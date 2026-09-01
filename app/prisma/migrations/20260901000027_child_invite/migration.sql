-- 아이 앱 초대 — FR-002 · 어긋남 대장 D33.
--
-- 🔴 링크에 실리는 것을 **한 번 쓰면 죽는 24시간짜리 코드**로 바꾼다.
--    한동안 180일짜리 기기 토큰 자체를 주소에 실었다 — 그 문자열 하나면 누구든
--    그 아이의 화면에 들어갔고, 주소는 브라우저 기록·서버 로그·링크 미리보기에 남는다.
--
-- 🔴 원문은 저장하지 않는다. 해시만 남기므로 DB 가 새도 링크는 새지 않는다.
-- 🔴 소진은 원자적이다 — 두 기기가 같은 링크를 동시에 열면 한 쪽만 성립한다.
--    `update ... where used_at is null` 한 문장이 그것을 보장한다.

CREATE TABLE IF NOT EXISTS identity.child_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid        NOT NULL,
  child_id    uuid        NOT NULL,
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS child_invites_guardian_child_idx
  ON identity.child_invites (guardian_id, child_id);
