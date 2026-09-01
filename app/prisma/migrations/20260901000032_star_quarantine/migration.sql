-- 별 원장 정합성 격리 — FR-012 · AC-012-3 · 어긋남 대장 D39.
--
-- 🔴 번호가 31 이 아니라 32 다. 아이 화면 세션이 같은 시각에 31(`txn_mcc`)을 썼다.
--    「번호를 잡자마자 알린다」로 바꿨는데도 커밋에 묻어 가면 못 본다 — 오늘 세 번째다.
--
-- 🔴 지금은 멱등키로 중복만 막고, **잔액과 원장 합이 어긋났는지 아무도 대조하지 않는다.**
--    「별 원장 정합성 오류 0%」가 허용 오차 0인 7개 항목 중 하나인데 재는 사람이 없었다.
--
-- 🔴 어긋난 줄에 **표시만** 한다. 잔액은 건드리지 않는다 —
--    AC-012-3 이 「아동의 잔액은 감소하지 않으며」를 요구한다.
--    아이가 잘못한 게 아닌데 별을 뺏으면 그 화면을 다시는 못 믿는다.

ALTER TABLE activity.star_ledger
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz;

-- 격리된 줄만 빠르게 찾는다 — 부모 화면이 「확인이 필요한 기록」으로 보여준다
CREATE INDEX IF NOT EXISTS star_ledger_quarantined_idx
  ON activity.star_ledger (child_id) WHERE quarantined_at IS NOT NULL;
