-- 기기 세션 토큰 — 어긋남 대장 D5 · 사용자 결정 2026-08-31 (안 A)
--
-- 🔴 왜 필요한가 —
--    `CON-001` 은 「보호자 세션 만료 → 아동 화면 잠금 → 보호자 재인증」이라고 적었다.
--    그대로 두면 **부모가 옆에 없을 때 아이가 아무것도 못 한다.** 이 제품의 전제가
--    「아이가 스스로 실천한다」이므로 성립하지 않는다.
--
-- 세션을 둘로 나눈다
--    보호자 세션 — 짧다. 전 화면
--    기기 세션   — 길다. **`/child/**` 만.** 보호자 권한을 전혀 갖지 않는다
--
-- 이래도 규칙은 지켜진다
--    S5   아이는 여전히 자격증명이 없다. **기기가 등록된 것**이지 아이가 로그인한 게 아니다
--    ACE-8.2 기기 토큰은 「누구의 아이인가」만 말한다.
--            동의는 **매 진입마다 서버가 조회**한다 — 토큰이 있다고 건너뛰지 않는다

ALTER TABLE "identity"."device_sessions"
  -- 토큰 원문은 쿠키에만 있다. 서버에는 해시만 남긴다
  ADD COLUMN "token_hash" TEXT,
  -- 보호자 세션보다 길다
  ADD COLUMN "expires_at" TIMESTAMPTZ(6),
  -- 보호자가 「이 기기 해제」를 누른 시각. 값이 있으면 즉시 무효
  ADD COLUMN "revoked_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "device_sessions_token_hash_key" ON "identity"."device_sessions"("token_hash");

-- 살아 있는 아동 모드 기기만 빠르게 찾는다
CREATE INDEX "device_sessions_live_child_idx"
  ON "identity"."device_sessions" ("child_id")
  WHERE "mode" = 'CHILD' AND "revoked_at" IS NULL;

COMMENT ON COLUMN "identity"."device_sessions"."token_hash" IS
  '기기 토큰 해시. 이 토큰은 /child/** 만 연다 — 보호자 권한 없음 (D5)';
