-- app_events 주차 파티셔닝 — DAT-002 · REQ-TEC-004 예외 · Y3
--
-- 이벤트는 대용량이고 **주차 단위로 조회**된다. Prisma 는 파티션을 관리하지 못하므로
-- raw SQL 로 두되, 생성·회전을 사람 손에 맡기지 않는다.
--
-- 🔴 파티션 키는 `client_ts` 다. 오프라인에서 발생한 이벤트가
--    재연결된 주로 넘어가면 주차 귀속이 틀어진다 (REQ-TEC-012).

-- Prisma 가 만든 일반 테이블을 파티션 테이블로 바꾼다.
ALTER TABLE "activity"."app_events" RENAME TO "app_events_unpartitioned";

CREATE TABLE "activity"."app_events" (
  "id"              UUID         NOT NULL,
  "event_type"      TEXT         NOT NULL,
  "child_id"        UUID,
  "guardian_id"     UUID,
  "client_ts"       TIMESTAMPTZ(6) NOT NULL,
  "server_ts"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotency_key" TEXT         NOT NULL,
  "payload"         JSONB        NOT NULL,
  -- 파티션 테이블의 유니크 제약에는 파티션 키가 포함돼야 한다.
  -- 멱등은 (키, 주차) 조합으로 성립한다 — 같은 주 안에서 중복이 막히면 충분하다
  PRIMARY KEY ("id", "client_ts"),
  UNIQUE ("idempotency_key", "client_ts")
) PARTITION BY RANGE ("client_ts");

INSERT INTO "activity"."app_events"
SELECT "id","event_type","child_id","guardian_id","client_ts","server_ts","idempotency_key","payload"
FROM "activity"."app_events_unpartitioned";

DROP TABLE "activity"."app_events_unpartitioned";

CREATE INDEX "app_events_event_type_client_ts_idx" ON "activity"."app_events" ("event_type","client_ts");
CREATE INDEX "app_events_child_id_client_ts_idx"   ON "activity"."app_events" ("child_id","client_ts");

-- ── 파티션 생성·회전 ───────────────────────────────────────────
-- 🔴 「미래 주차 파티션이 **미리** 만들어진다」가 AC 다.
--    적재 시점에 파티션이 없으면 INSERT 가 실패하고 이벤트가 유실된다.

CREATE OR REPLACE FUNCTION "activity".ensure_event_partitions(weeks_ahead int DEFAULT 4)
RETURNS int AS $$
DECLARE
  wk   date;
  i    int;
  made int := 0;
  nm   text;
BEGIN
  FOR i IN 0..weeks_ahead LOOP
    wk := date_trunc('week', now() + (i || ' weeks')::interval)::date;
    nm := format('app_events_%s', to_char(wk, 'IYYY_IW'));
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'activity' AND c.relname = nm
    ) THEN
      EXECUTE format(
        'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
        'activity', nm, 'activity', 'app_events', wk, wk + 7);
      made := made + 1;
    END IF;
  END LOOP;
  RETURN made;
END $$ LANGUAGE plpgsql;

COMMENT ON FUNCTION "activity".ensure_event_partitions(int) IS
  '주차 파티션 사전 생성 — pg_cron 이 매일 호출한다. 반환값은 새로 만든 개수 (DAT-002)';

-- 지금 시점 기준으로 지난 주 ~ 4주 뒤까지 확보한다
SELECT "activity".ensure_event_partitions(4);
DO $$
DECLARE wk date := date_trunc('week', now() - interval '1 week')::date;
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
    'activity', format('app_events_%s', to_char(wk,'IYYY_IW')), 'activity', 'app_events', wk, wk + 7);
END $$;
