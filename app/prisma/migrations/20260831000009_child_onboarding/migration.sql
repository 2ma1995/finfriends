-- 아이 온보딩 진행 — 어긋남 대장 D13
--
-- 🔴 아이는 **설명을 들은 적이 없다.** 기기 토큰으로 열면 바로 방이 나온다.
--    「했어요」를 눌러도 별이 바로 안 붙는다는 것을 모르면 아이는 고장 났다고 느낀다 (AC-6.2).
--    그래서 첫 진입에 한 번 설명하고, **봤는지를 기억해야** 매번 다시 보여주지 않는다.
--
-- 🔴 진행 단계를 서버에 둔다. 아이 기기는 초기화될 수 있고 localStorage 는 남지 않는다.
--    중간에 앱을 닫아도 본 데까지 이어서 본다.

CREATE TABLE "activity"."child_onboarding" (
    "child_id"    UUID           NOT NULL,
    -- 마지막으로 **본** 단계. 0 부터 센다
    "step"        INTEGER        NOT NULL DEFAULT 0,
    -- 끝까지 봤다. 별 1개(ONBOARDING_LEARN)는 이때 한 번만 붙는다
    "finished_at" TIMESTAMPTZ(6),
    -- 건너뛰었다. 별은 없지만 다시 막지 않는다 — 아이를 가두지 않는다
    "skipped_at"  TIMESTAMPTZ(6),
    "started_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "child_onboarding_pkey" PRIMARY KEY ("child_id")
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."child_onboarding" TO app_activity;
ALTER TABLE "activity"."child_onboarding" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."child_onboarding"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
