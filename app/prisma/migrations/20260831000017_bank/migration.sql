-- 아이 통장(보호자용) — SRS §3 보호자 화면. 어긋남 대장 D21
--
-- SRS §3 은 보호자 화면을 일곱 개로 적었다:
--   온보딩 · 동의 · 성장 나무 · 월간 숲 · **아이 통장(충전 · 미션 관리 · 이자율 설정)** · 소비 내역 · 마이페이지
-- 그중 「아이 통장」이 빠져 있었다.
--
-- 🔴 **잔액은 우리 것이 아니다.** 선불충전금은 제휴사가 100% 별도관리한다(ADR-004).
--    실제 잔액·충전은 제휴사 API(`requestTopUp` · §6.1 진입점 9번)가 담당하고
--    착수 조건 **D1**(수수료율 · SLA)이 미확정이다. 그래서 여기 값은 **시연용 표시**다.
--
-- 🔴 이자율은 **부모가 직접 주는 이자**다 (§9 근거표 A3 — 「보호자는 위시리스트 목표에
--    실제로 이자를 준다」 · 검증 대기). 외부 예적금(F15 · REQ-FUNC-014)과 **다른 기능**이며
--    그쪽은 P-20 법률 검토 대기다. **이자 주기는 D6 미결**이라 지급 계산을 넣지 않는다.

ALTER TABLE "identity"."guardian_accounts"
  -- 🔴 시연용 잔액 표시. 실제 잔액은 제휴사가 갖는다
  ADD COLUMN "mock_balance_won" INTEGER NOT NULL DEFAULT 0,
  -- 부모가 정하는 이자율(%). 🔴 지급 주기는 D6 미결이라 계산하지 않는다
  ADD COLUMN "savings_interest_pct" INTEGER;

COMMENT ON COLUMN "identity"."guardian_accounts"."mock_balance_won" IS
  '🔴 시연용 잔액. 실제 선불충전금은 제휴사가 별도관리한다 (어긋남 대장 D21)';
COMMENT ON COLUMN "identity"."guardian_accounts"."savings_interest_pct" IS
  '부모가 주는 이자율(%). 지급 주기는 D6 미결 (어긋남 대장 D21)';

-- 음수 잔액은 만들 수 없다. 시연이라도 말이 되는 상태만 둔다
ALTER TABLE "identity"."guardian_accounts"
  ADD CONSTRAINT "guardian_accounts_mock_balance_nonneg" CHECK ("mock_balance_won" >= 0),
  ADD CONSTRAINT "guardian_accounts_interest_range"
    CHECK ("savings_interest_pct" IS NULL OR ("savings_interest_pct" BETWEEN 0 AND 20));
