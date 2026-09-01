-- 봉투형 소비 관리 — `FR-020` · `FR-021` · 어긋남 대장 D32
--
-- 🔴 **봉투는 표시용 구획이다.** 실제 선불 잔액은 하나이고 앱은 배분만 보여준다(§용어).
--    봉투마다 진짜 지갑이 있는 게 아니다 — 합이 곧 충전액이다.
--
-- 🔴 **⭐ 판정은 결제 시각의 배분 스냅샷으로 한다** (`AC-021-3`).
--    사후에 봉투를 늘려 판정을 뒤집을 수 있으면 「계획대로 썼다」가 무의미해진다.
--    그래서 결제 행이 **그 시각의 한도와 잔액을 자기 안에 박아 둔다.**

CREATE TABLE "activity"."envelopes" (
    "id"          UUID           NOT NULL,
    "child_id"    UUID           NOT NULL,
    -- 봉투 이름. 아이가 정한다
    "name"        TEXT           NOT NULL,
    "emoji"       TEXT           NOT NULL DEFAULT '📦',
    -- 이 봉투에 담기로 한 금액
    "allocated"   INTEGER        NOT NULL DEFAULT 0,
    -- 🔴 업종 코드 목록. 결제가 오면 이걸로 봉투를 고른다
    "categories"  TEXT[]         NOT NULL DEFAULT '{}',
    -- 🔴 미분류 봉투 — 아이당 하나. 업종을 못 고르면 여기서 뺀다 (FR-020 예외)
    "is_default"  BOOLEAN        NOT NULL DEFAULT false,
    "rank"        INTEGER        NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "envelopes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "envelopes_allocated_nonneg" CHECK ("allocated" >= 0)
);

CREATE INDEX "envelopes_child_idx" ON "activity"."envelopes"("child_id", "rank");
-- 🔴 미분류 봉투는 아이당 **하나**다. 둘이면 결제가 어디로 갈지 알 수 없다
CREATE UNIQUE INDEX "envelopes_one_default" ON "activity"."envelopes"("child_id") WHERE "is_default";

-- 결제 한 건 — 봉투에서 빠진 기록
CREATE TABLE "activity"."envelope_spends" (
    "id"            UUID           NOT NULL,
    "child_id"      UUID           NOT NULL,
    "envelope_id"   UUID,
    -- 원본 거래 (카드 내역). 취소·환불 때 되짚는다
    "txn_id"        UUID,
    "merchant"      TEXT           NOT NULL,
    "category"      TEXT           NOT NULL,
    "amount"        INTEGER        NOT NULL,
    -- 🔴 **결제 시각의 스냅샷** — 그때 이 봉투에 얼마가 담겨 있었고 얼마가 남아 있었나.
    --    사후에 봉투를 고쳐도 이 숫자는 안 바뀐다 (AC-021-3)
    "snap_allocated" INTEGER       NOT NULL,
    "snap_remaining" INTEGER       NOT NULL,
    -- 봉투 안이었나. ⭐ 판정 결과가 여기 박힌다
    "within"        BOOLEAN        NOT NULL,
    -- 🔴 넘긴 금액. 부모 화면이 「간식 봉투 700원 초과」를 말한다 (AC-021-2)
    "over_by"       INTEGER        NOT NULL DEFAULT 0,
    -- 업종을 못 고른 건 — 부모에게 분류를 요청한다
    "unclassified"  BOOLEAN        NOT NULL DEFAULT false,
    -- 취소·환불로 되돌렸나. 🔴 되돌려도 ⭐는 회수하지 않는다 (FR-021 예외 ③)
    "refunded_at"   TIMESTAMPTZ(6),
    "occurred_at"   TIMESTAMPTZ(6) NOT NULL,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "envelope_spends_pkey" PRIMARY KEY ("id")
);

-- 🔴 한 거래는 한 번만 봉투에서 빠진다. 웹훅이 두 번 와도 두 번 안 빠진다
CREATE UNIQUE INDEX "envelope_spends_txn_key" ON "activity"."envelope_spends"("txn_id") WHERE "txn_id" IS NOT NULL;
CREATE INDEX "envelope_spends_child_idx" ON "activity"."envelope_spends"("child_id", "occurred_at" DESC);

-- 재배분 이력 — 🔴 아이가 봉투를 고치면 **부모 화면에 남는다** (AC-020-3)
CREATE TABLE "activity"."envelope_changes" (
    "id"         UUID           NOT NULL,
    "child_id"   UUID           NOT NULL,
    -- 바꾼 결과를 통째로 남긴다. 이름이 바뀔 수도 있어 id 만으로는 못 읽는다
    "snapshot"   JSONB          NOT NULL,
    "total"      INTEGER        NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "envelope_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "envelope_changes_child_idx" ON "activity"."envelope_changes"("child_id", "changed_at" DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."envelopes"         TO app_activity;
GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."envelope_spends"   TO app_activity;
GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."envelope_changes"  TO app_activity;
ALTER TABLE "activity"."envelopes"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity"."envelope_spends"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity"."envelope_changes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."envelopes"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
CREATE POLICY child_scope ON "activity"."envelope_spends"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
CREATE POLICY child_scope ON "activity"."envelope_changes"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
