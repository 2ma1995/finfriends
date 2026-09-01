-- 아이 통장 잔액을 용돈 원장 위로 옮긴다 — 어긋남 대장 D22.
--
-- 🔴 `mock_balance_won` 을 지운다. 잔액은 activity.allowance_ledger 의 **합**이다.
--    컬럼과 원장에 잔액이 따로 있어서 /parent/bank 는 60,000원을,
--    /parent/allowance 와 아이 화면은 20,000원을 보여주고 있었다.
--
-- 🔴 **컬럼 값을 원장으로 옮기지 않는다.** 원장은 실제로 일어난 일을 적는 곳이고,
--    저 60,000원은 보호자가 준 돈이 아니라 시연 버튼이 올린 숫자다.
--    옮기면 「용돈을 받았어요 60,000원」이라는 **없던 기록**이 아이 화면에 생긴다.
--    시연 데이터이므로 버리고, 버튼을 다시 누르면 이번에는 원장에 남는다.
--
-- 🔴 `savings_interest_pct` · `mock_card_status` · `mock_card_issued_at` 은 그대로 둔다.
--    아이 화면이 이자율과 카드 배송 상태를 읽어 쓴다 (아이 화면 세션 인계).

ALTER TABLE identity.guardian_accounts DROP COLUMN IF EXISTS mock_balance_won;
