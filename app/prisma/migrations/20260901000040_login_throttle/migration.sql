-- 로그인 시도 제한 — 어긋남 대장 D54.
--
-- 🔴 **없어서 비밀번호를 무한히 시도할 수 있었다.**
--    아이러니하게도 네 자리 PIN 은 다섯 번이면 잠그는데(D42) 부모 비밀번호는 안 막았다.
--    뚫리면 아이 데이터 전체가 열린다 — 아동 대상 서비스에서 그대로 둘 수 없다.
--
-- 🔴 Supabase 이관 때 이 컬럼은 사라진다. Auth 쪽이 같은 일을 한다 (D10).
--    그래도 지금 막아야 한다 — 이관 전에 시연·베타가 있다.

ALTER TABLE dev_auth.users
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until    timestamptz;
