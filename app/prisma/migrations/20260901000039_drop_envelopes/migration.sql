-- 봉투 표를 떨어뜨린다 — 어긋남 대장 D40 의 ③단계. 사용자 확인 받음
--
-- 순서를 지켜 왔다.
--   ① 부모 화면에서 읽기 제거   (저쪽 `f9d0311` · `d1d0279`)
--   ② 아이 화면 · 모듈 제거      (`modules/envelope` · `actions/envelope.ts`)
--   ③ 표 드롭                    ← 여기
--
-- 반대로 했으면 화면이 없는 표를 부르다 죽는다. `D35` 에서 겪은 순서 문제다.
--
-- 🔴 **잃는 기록이 없다.** 봉투로 쓴 돈(`envelope_spends`)이 **0건**이다 —
--    실제 결제가 하나도 없었다. `envelopes` 8건과 `envelope_changes` 2건은
--    만들며 시험한 것이고, `merchant_rules` 는 0건이다.
--
-- 🔴 **`contracts/mcc` 는 남긴다.** 봉투 전용이 아니다 — `modules/card` 가
--    카드 사용 내역의 업종 코드를 4영역으로 접을 때 쓴다. 봉투가 없어도
--    「어디서 썼는지」는 여전히 분류해야 한다.

DROP TABLE IF EXISTS "activity"."envelope_spends";
DROP TABLE IF EXISTS "activity"."envelope_changes";
DROP TABLE IF EXISTS "activity"."envelopes";
DROP TABLE IF EXISTS "activity"."merchant_rules";
