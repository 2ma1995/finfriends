-- 🔴 가짜 카드 신청 단계 — 시연 전용. 어긋남 대장 D20
--
-- 버튼 한 번으로 발급되던 것을 **신청 과정 4단계**로 바꾼다.
-- 실제 흐름(다이어그램 A: 카드 신청 → 배송 대기 → 카드 등록)의 모양만 따른다.
--
-- 🔴 여전히 **아무 입력도 받지 않는다.** 각 단계는 「다음」 버튼뿐이다.
--    본인확인은 제휴사 발급 플로우에 위임되므로(D-03 · ADR-T09)
--    우리 화면에 실명·주민번호·계좌·카드번호가 들어올 자리가 없다.

CREATE TYPE "identity"."MockCardStatus" AS ENUM ('REQUESTED', 'VERIFIED', 'SHIPPING', 'ACTIVE');

ALTER TABLE "identity"."guardian_accounts"
  ADD COLUMN "mock_card_status" "identity"."MockCardStatus";

COMMENT ON COLUMN "identity"."guardian_accounts"."mock_card_status" IS
  '🔴 시연 전용 가짜 카드 단계. PTN-001 착수 시 삭제한다 (어긋남 대장 D20)';

-- 이미 「발급됨」이던 계정은 마지막 단계로 옮긴다
UPDATE "identity"."guardian_accounts"
   SET "mock_card_status" = 'ACTIVE'
 WHERE "mock_card_issued_at" IS NOT NULL;
