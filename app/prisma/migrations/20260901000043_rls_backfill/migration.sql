-- RLS 누락 보충 — DAT-001 · REQ-TEC-006 · 어긋남 대장 D57
--
-- 🔴 **검사가 「11개면 통과」였다.** 표가 19개로 늘었는데 기대값이 11 로 못박혀 있어
--    새 표에 RLS 가 빠져도 게이트가 통과했다. 「켜진 수 = 표 수」로 바꾸자
--    **5개가 드러났다** — 아래 다섯이다.
--
-- 🔴 **activity 는 identity 를 참조하지 않는다** (`REQ-NF-009`).
--    `notifications` 는 `guardian_id` 로 걸리는데, 그 값을 `identity.guardian_accounts`
--    에서 확인하려 하면 **분리가 무너진다.** 그래서 세션 설정(`app.guardian_id`)과
--    직접 비교한다 — 값만 보고 표를 안 본다.
--
-- 🔴 **`mission_photos` 에는 `child_id` 가 없다.** `mission_id` 뿐이다.
--    같은 스키마 안의 `activity.missions` 를 거쳐 아이 범위로 잇는다 —
--    스키마를 넘지 않으므로 분리는 지켜진다.
--
-- 🔴 **이 정책들은 지금 런타임에서 작동하지 않는다.** 앱이 `app.child_ids` ·
--    `app.auth_ref` 를 주입하지 않고 소유자 역할로 붙기 때문이다(D57 에 기록).
--    그래도 켜 두는 이유: 역할 분리를 켜는 날 표마다 다시 훑지 않아도 되고,
--    게이트가 **새 표의 누락을 그날부터 잡는다.** 나중에 붙이면 반드시 빠뜨린다.

-- ── identity — 보호자 자기 것만 ──
ALTER TABLE "identity"."child_invites" ENABLE ROW LEVEL SECURITY;
CREATE POLICY invite_of_guardian ON "identity"."child_invites"
  USING (guardian_id IN (
    SELECT id FROM "identity"."guardian_accounts"
    WHERE auth_ref = current_setting('app.auth_ref', true)
  ));

ALTER TABLE "identity"."push_subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_of_guardian ON "identity"."push_subscriptions"
  USING (guardian_id IN (
    SELECT id FROM "identity"."guardian_accounts"
    WHERE auth_ref = current_setting('app.auth_ref', true)
  ));

-- ── activity — 보호자 알림. identity 를 보지 않고 설정값과 비교한다 ──
ALTER TABLE "activity"."notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY guardian_scope ON "activity"."notifications"
  USING (guardian_id::text = current_setting('app.guardian_id', true));

-- ── activity — 미션 사진. mission 을 거쳐 아이 범위로 잇는다 ──
ALTER TABLE "activity"."mission_photos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY photo_of_child_mission ON "activity"."mission_photos"
  USING (mission_id IN (
    SELECT id FROM "activity"."missions"
    WHERE child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ','))
  ));

-- ── activity — 감사 로그. 파티션 부모에 걸면 자식에도 적용된다 ──
-- 🔴 감사 로그는 **아이 범위와 보호자 범위 둘 다**로 들어온다
--    (`child_id` 가 없는 사건도 있다 — 로그인 실패 같은 것).
--    둘 중 하나라도 맞으면 보이게 한다. 안 그러면 부모가 자기 사건을 못 본다.
ALTER TABLE "activity"."app_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_scope ON "activity"."app_events"
  USING (
    (child_id IS NOT NULL
      AND child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')))
    OR (guardian_id IS NOT NULL
      AND guardian_id::text = current_setting('app.guardian_id', true))
  );
