-- 미션 표 — PRC-001. 어긋남 대장 D10
--
-- 🔴 SRS 가 `ApprovalState` 열거형은 정의해 뒀는데 **쓰는 표가 없었다.**
--    그래서 아이가 미션을 하고 보호자가 승인하는 경로 전체가 비어 있었다 —
--    부모 화면의 「승인 대기 N건」이 항상 0이고, MISSION_APPROVED 별을 받을 길이 없다.

CREATE TABLE "activity"."missions" (
    "id"            UUID           NOT NULL,
    "child_id"      UUID           NOT NULL,
    -- 조건·보상은 보호자가 미리 정한다 (PRC-001)
    "guardian_id"   UUID           NOT NULL,
    "title"         TEXT           NOT NULL,
    "topic"         "activity"."LearningTopic" NOT NULL,
    "reward"        INTEGER        NOT NULL DEFAULT 1,
    "state"         "activity"."ApprovalState" NOT NULL DEFAULT 'PENDING',
    -- 아이가 「했어요」를 누른 시각. null 이면 아직 안 함
    "done_at"       TIMESTAMPTZ(6),
    "decided_at"    TIMESTAMPTZ(6),
    -- 거절 사유 — 「미실천」과 구별해 보여준다
    "reject_reason" TEXT,
    -- 🔴 완료 시점 주기. 지연 승인이 다음 주기 나무를 부풀리지 않게 (ACE-6.2)
    "cycle_id"      INTEGER,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "missions_child_id_state_idx"    ON "activity"."missions"("child_id", "state");
CREATE INDEX "missions_guardian_id_state_idx" ON "activity"."missions"("guardian_id", "state");

-- 같은 규율을 건다 — activity 역할만 보고, 아이 범위로 제한한다
GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."missions" TO app_activity;
ALTER TABLE "activity"."missions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."missions"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
