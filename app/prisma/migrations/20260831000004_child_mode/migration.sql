-- 아동 모드 — 어긋남 대장 D5 · REQ-NF-011 · S5
--
-- 🔴 SRS 에 없던 개념이다. 왜 필요한가:
--    아동은 독립 자격증명을 갖지 않으므로(S5) **아이 기기에도 살아 있는 것은 보호자 세션**이다.
--    막지 않으면 아이가 /parent/** (승인·결제)에 들어간다 — 보호자 승인(PRC-001)의 전제가 무너진다.
--
-- ⚠️ `prisma migrate diff` 가 이 시점에 `app_events` 를 되돌리려 한다.
--    Prisma 는 파티셔닝을 모델링하지 못하므로 **그 차이는 무시하고 손으로 뺐다** (DAT-002 · REQ-TEC-004 예외).

CREATE TYPE "identity"."DeviceMode" AS ENUM ('GUARDIAN', 'CHILD');

-- 아동 모드를 **푸는** 열쇠. 해시만 저장한다.
-- 재로그인이 아니라 PIN 인 이유 — 아이 폰에서 보호자 비밀번호를 매번 치면 아이가 그 비밀번호를 알게 된다.
ALTER TABLE "identity"."guardian_accounts" ADD COLUMN "child_mode_pin_hash" TEXT;

-- 「이 기기는 아이 것」을 **서버가 안다.** 쿠키만 두면 지우면 그만이다.
CREATE TABLE "identity"."device_sessions" (
    "id"               UUID           NOT NULL,
    "guardian_id"      UUID           NOT NULL,
    -- 기기를 가리키는 무작위 값. 기기 고유 식별자를 수집하지 않는다
    "device_ref"       TEXT           NOT NULL,
    "mode"             "identity"."DeviceMode" NOT NULL DEFAULT 'GUARDIAN',
    -- 아동 모드일 때 이 기기가 여는 아이. GUARDIAN 이면 null
    "child_id"         UUID,
    -- 🔴 보호자 경로 진입 시도 누적. 1건 이상이면 S5 알림 대상이다
    "blocked_attempts" INTEGER        NOT NULL DEFAULT 0,
    "last_seen_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_sessions_device_ref_key" ON "identity"."device_sessions"("device_ref");
CREATE INDEX "device_sessions_guardian_id_idx" ON "identity"."device_sessions"("guardian_id");

ALTER TABLE "identity"."device_sessions"
  ADD CONSTRAINT "device_sessions_guardian_id_fkey"
  FOREIGN KEY ("guardian_id") REFERENCES "identity"."guardian_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 새 표에도 같은 규율을 건다 — identity 역할만 보고, 보호자는 자기 기기만 본다
GRANT SELECT, INSERT, UPDATE, DELETE ON "identity"."device_sessions" TO app_identity;

ALTER TABLE "identity"."device_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY device_of_guardian ON "identity"."device_sessions"
  USING (guardian_id IN (
    SELECT id FROM "identity"."guardian_accounts"
    WHERE auth_ref = current_setting('app.auth_ref', true)
  ));

-- S5 감사 — 아동 모드 기기에서 보호자 경로를 두드린 흔적. 0행이어야 한다
CREATE OR REPLACE FUNCTION "identity".s5_blocked_parent_attempts()
RETURNS TABLE(device_ref text, guardian_id uuid, attempts int, last_seen timestamptz) AS $$
  SELECT device_ref::text, guardian_id, blocked_attempts, last_seen_at
  FROM "identity"."device_sessions"
  WHERE mode = 'CHILD' AND blocked_attempts > 0;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION "identity".s5_blocked_parent_attempts() IS
  'S5 감사 — 아동 모드에서 보호자 경로 진입 시도. 일 1회 배치가 호출한다 (SEC-001 · REQ-NF-011)';
