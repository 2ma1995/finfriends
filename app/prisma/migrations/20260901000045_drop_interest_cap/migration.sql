-- 우리 집 적금 이자율 상한 제거 — 어긋남 대장 D74.
--
-- 🔴 **상한 20% 에 근거가 없었다.** SRS 에도, `D25` 에도, 코드 주석에도 없었다 —
--    `modules/savings` 에서 근거가 안 적힌 유일한 상수였다.
--
-- 🔴 게다가 **엉뚱한 숫자에 걸려 있었다.** 상한이 「기간」 이율에 붙는데
--    화면은 「연 환산」을 보여준다(`FR-031`).
--      1개월 20% → 연 240% (통과했다)   ·   12개월 20% → 연 20% (여기서만 조였다)
--    막는 값과 보여주는 값이 서로 달랐고, 기간이 길수록 더 조이는 셈이었다.
--
-- 🔴 **부모 돈이고 부모 집 약속이다** (2026-09-03 사용자 결정).
--    앱이 집안 약속의 액수를 정하지 않는다. 대신 부모가 판단할 재료를 준다 —
--    화면이 연 환산과 시중 3.40~7.00% · Greenlight 19.84% 를 나란히 놓는다.
--
-- 🔴 **음수는 계속 막는다.** 그건 상한이 아니라 부호다 —
--    이자가 음수면 만기에 아이 돈이 줄어든다. 「불리기」가 아니다.
--
-- 🔴 코드만 고쳤으면 운영에서 500 이 났다. 25% 를 넣어 보니 이 제약이
--    `23514` 로 터졌다 — 값을 실제로 넣어 본 검증이 잡았다.

ALTER TABLE "identity"."guardian_accounts"
  DROP CONSTRAINT IF EXISTS "guardian_accounts_interest_range";

ALTER TABLE "identity"."guardian_accounts"
  ADD CONSTRAINT "guardian_accounts_interest_range"
    CHECK ("savings_interest_pct" IS NULL OR "savings_interest_pct" >= 0);
