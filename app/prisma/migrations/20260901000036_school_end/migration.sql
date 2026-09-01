-- 하교 시각 — 봉투를 접고 계획 카드로 돌아오며 생긴 것. 어긋남 대장 D41
--
-- 🔴 **묻는 때를 사람이 정한다.** 「오늘 쓸 계획 있니?」를 아무 때나 물으면
--    아침 등교 전에도, 잠들기 전에도 뜬다. 물어야 쓸모 있는 순간은
--    **아이가 학교에서 나와 돈을 쓸 수 있게 된 직후** 하나뿐이다.
--    그 시각을 아는 사람은 서버가 아니라 **부모**다.
--
-- 🔴 **분으로 담는다.** `TIME` 은 시간대를 달고 다니고, 이 값은 시계가 아니라
--    **하루 중 어디쯤**이다. 자정부터 몇 분(0–1439)으로 두면 서버가 어디서 돌든
--    KST 로 환산한 지금과 그대로 견줄 수 있다.
--
-- 🔴 **한 아이에 한 줄이다.** 요일별 하교 시각은 아직 안 받는다 —
--    받는 순간 부모가 다섯 번 입력해야 하고, 그러면 아무도 안 넣는다.

CREATE TABLE "activity"."child_schedules" (
    "child_id"       UUID           NOT NULL,
    "guardian_id"    UUID           NOT NULL,
    -- 자정 기준 분. 900 = 15:00
    "school_end_min" INT            NOT NULL,
    -- 🔴 **오늘 이미 물었는지**를 여기 적는다. 없으면 화면을 열 때마다 다시 뜬다.
    --    KST 날짜 문자열(`YYYY-MM-DD`)이다 — `kstDay()` 가 주는 값 그대로다
    "asked_day"      TEXT,
    "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "child_schedules_pkey" PRIMARY KEY ("child_id"),
    CONSTRAINT "child_schedules_min_range" CHECK ("school_end_min" BETWEEN 0 AND 1439)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."child_schedules" TO app_activity;
ALTER TABLE "activity"."child_schedules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."child_schedules"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
