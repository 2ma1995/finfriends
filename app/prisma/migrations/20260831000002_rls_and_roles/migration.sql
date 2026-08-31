-- RLS · 역할 분리 — DAT-001 · REQ-TEC-006 · ADR-T03
--
-- 🔴 「아동 식별정보와 학습·실천 데이터를 분리 저장」을 **단일 DB에서** 성립시키는 유일한 수단이다.
--    스키마만 나누면 앱 역할이 조인할 수 있어 REQ-NF-009(결합 조회 0건)가 깨진다.
--    그래서 **역할을 두 개로 나누고, 각 역할이 한 스키마만 보게** 한다.
--
-- 왜 Prisma 가 아니라 raw SQL 인가 — Prisma 는 역할·정책·GRANT 를 모델링하지 않는다.
-- REQ-TEC-004 가 raw SQL 을 **마이그레이션에 한해** 허용한다.

-- ── 역할 ───────────────────────────────────────────────────────
-- app_identity  : identity 만 본다 (온보딩 · 동의 · 프로필)
-- app_activity  : activity 만 본다 (학습 · 실천 · 별 · 나무 · 숲)
-- 애플리케이션은 화면이 이름을 필요로 하면 **두 번 조회해 계층에서 합친다.** 조인하지 않는다.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_identity') THEN
    CREATE ROLE app_identity NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_activity') THEN
    CREATE ROLE app_activity NOLOGIN;
  END IF;
END $$;

REVOKE ALL ON SCHEMA "identity" FROM PUBLIC;
REVOKE ALL ON SCHEMA "activity" FROM PUBLIC;

GRANT USAGE ON SCHEMA "identity" TO app_identity;
GRANT USAGE ON SCHEMA "activity" TO app_activity;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "identity" TO app_identity;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "activity" TO app_activity;

ALTER DEFAULT PRIVILEGES IN SCHEMA "identity"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_identity;
ALTER DEFAULT PRIVILEGES IN SCHEMA "activity"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_activity;

-- 🔴 교차 접근을 명시적으로 막는다. 이것이 S3(결합 조회 차단)의 실체다.
--    권한 오류로 거부되고, 아래 감사 트리거가 시도를 남긴다.
REVOKE ALL ON SCHEMA "activity" FROM app_identity;
REVOKE ALL ON SCHEMA "identity" FROM app_activity;

-- ── RLS ────────────────────────────────────────────────────────
-- 보호자는 자기 아이만, 아동 데이터는 자기 것만 본다.
-- 아동은 독립 자격증명을 갖지 않으므로(S5) 세션은 항상 보호자 것이다.

ALTER TABLE "identity"."guardian_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."child_accounts"    ENABLE ROW LEVEL SECURITY;

CREATE POLICY guardian_self ON "identity"."guardian_accounts"
  USING (auth_ref = current_setting('app.auth_ref', true));

CREATE POLICY child_of_guardian ON "identity"."child_accounts"
  USING (guardian_id IN (
    SELECT id FROM "identity"."guardian_accounts"
    WHERE auth_ref = current_setting('app.auth_ref', true)
  ));

-- activity 는 child_id 로만 건다. identity 를 참조하지 않는다 — 참조하면 분리가 무너진다.
-- 허용 아동 목록은 애플리케이션이 세션마다 주입한다.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'learning_progress','practice_credits','star_ledger','tree_states',
    'forest_snapshots','plan_cards','spending_records','wishlists'
  ] LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'activity', t);
    EXECUTE format($f$
      CREATE POLICY child_scope ON %I.%I
        USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')))
    $f$, 'activity', t);
  END LOOP;
END $$;

-- ── 금지 필드 상시 검사 (S1 · S2 · S4 · REQ-TEC-009) ──────────
-- 🔴 없는 것이 설계다. 스캔이 그 **부재**를 매일 확인한다.
--    좌표 · 얼굴 이미지 · 별↔현금 전환 컬럼이 생기면 즉시 잡힌다.

CREATE OR REPLACE FUNCTION "activity".assert_no_forbidden_columns()
RETURNS TABLE(schema_name text, table_name text, column_name text) AS $$
  SELECT table_schema::text, table_name::text, column_name::text
  FROM information_schema.columns
  WHERE table_schema IN ('identity', 'activity')
    AND (
      column_name ~* '(latitude|longitude|lat_|_lat|lng|geo|coord|location)'
      OR column_name ~* '(face|photo_url|selfie|portrait)'
      OR column_name ~* '(cash|withdraw|payout|to_savings|star_to_|convert)'
    );
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION "activity".assert_no_forbidden_columns() IS
  '금지 필드 스캔 — 결과가 0행이어야 한다. 일 1회 배치와 prebuild 게이트가 호출한다 (REQ-TEC-009)';
