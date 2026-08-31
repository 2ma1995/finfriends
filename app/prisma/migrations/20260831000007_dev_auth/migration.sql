-- 개발용 인증 — CON-001 · 🔴 로컬 전용
--
-- 🔴 **이 스키마는 Supabase 이관 때 통째로 버린다.**
--    Supabase Auth 가 `auth.users` 로 제공하는 것을 로컬 Postgres 에서 흉내 낸 것이다.
--    이관 시 바뀌는 것은 `src/lib/session/guardian-session.ts` 한 파일과
--    `dev_auth.users.id` → Supabase user id 이행뿐이다. `guardian_accounts.auth_ref` 의
--    **의미는 그대로다** — 「인증 시스템의 사용자 id」.
--
-- 왜 `auth` 가 아니라 `dev_auth` 인가 — Supabase 는 `auth` 스키마를 **자기가 관리**한다.
--    같은 이름을 쓰면 이관 때 충돌한다.
--
-- 왜 `identity` 에 넣지 않는가 — 비밀번호는 아동 식별정보가 아니고, 무엇보다
--    `identity` 는 이관 후에도 남는 스키마다. 버릴 것과 남을 것을 섞지 않는다.

CREATE SCHEMA IF NOT EXISTS "dev_auth";

COMMENT ON SCHEMA "dev_auth" IS
  '🔴 로컬 전용. Supabase Auth 대체물이며 이관 시 DROP SCHEMA CASCADE 한다 (CON-001)';

-- ── 사용자 ─────────────────────────────────────────────────────
-- Supabase `auth.users` 의 최소 형태. 보호자만 존재한다 —
-- 아동은 자격증명을 갖지 않으므로 여기에 행이 생기지 않는다 (REQ-NF-011 · S5).

CREATE TABLE "dev_auth"."users" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"         TEXT NOT NULL,
  -- scrypt(N=16384,r=8,p=1) · `salt:derivedKey` 16진 문자열. 원문은 저장하지 않는다
  "password_hash" TEXT NOT NULL,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 대소문자를 구분하지 않는다 — 같은 이메일로 두 계정이 생기면 보호자가 자기 아이를 못 찾는다
CREATE UNIQUE INDEX "users_email_lower_key" ON "dev_auth"."users" (lower("email"));

-- ── 세션 ───────────────────────────────────────────────────────
-- 기기 세션(`identity.device_sessions`)과 **같은 규율**을 쓴다:
-- 원문 토큰은 쿠키에만 두고 서버에는 해시만 남긴다.
--
-- 🔴 보호자 세션은 기기 세션보다 **짧다.** 둘의 수명이 다른 것이 D5-b 결정의 핵심이다 —
--    부모 세션이 죽어도 아이 기기는 계속 열린다.

CREATE TABLE "dev_auth"."sessions" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "dev_auth"."users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "sessions_user_id_idx" ON "dev_auth"."sessions" ("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "dev_auth"."sessions" ("expires_at");

-- ── 권한 ───────────────────────────────────────────────────────
-- 마이그레이션 2 가 세운 규율을 따른다 — PUBLIC 에서 회수하고 필요한 역할에만 준다.
-- `app_activity` 는 여기 접근할 이유가 없다. 인증은 identity 쪽 관심사다.

REVOKE ALL ON SCHEMA "dev_auth" FROM PUBLIC;
GRANT USAGE ON SCHEMA "dev_auth" TO app_identity;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "dev_auth" TO app_identity;
ALTER DEFAULT PRIVILEGES IN SCHEMA "dev_auth"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_identity;
