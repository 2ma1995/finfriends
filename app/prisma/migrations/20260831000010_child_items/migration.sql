-- 아이 보유 아이템 · 방 배치 — 어긋남 대장 D14
--
-- 🔴 여기가 없어서 방과 상점이 **브라우저 localStorage 를 지갑처럼 쓰고 있었다.**
--    별 40개와 보유 아이템이 프로토타입 상수로 박혀 있어, 오늘 가입한 아이가
--    이미 꾸며진 남의 방을 자기 방으로 봤다. 별 원장에 WARDROBE_SPEND 차감은
--    남는데 **무엇을 샀는지가 어디에도 없었다** — 원장과 화면이 서로 모른다.

-- 보유 — 무엇을 샀는가
CREATE TABLE "activity"."child_items" (
    "child_id"    UUID           NOT NULL,
    -- 카탈로그의 아이템 id. 카탈로그 자체는 **코드**다(에셋 정의이지 회원 데이터가 아니다)
    "item_id"     TEXT           NOT NULL,
    -- 살 때 실제로 낸 별. 나중에 값이 바뀌어도 그때 낸 값이 남는다
    "cost"        INTEGER        NOT NULL DEFAULT 0,
    "acquired_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "child_items_pkey" PRIMARY KEY ("child_id", "item_id")
);

-- 방 — 무엇을 입고, 무엇을 어디에 놓았는가. 아이당 한 줄
CREATE TABLE "activity"."child_room" (
    "child_id"     UUID           NOT NULL,
    -- 지금 입고 있는 캐릭터. 한 번에 하나만 입는다
    "character_id" TEXT           NOT NULL DEFAULT 'char-fb',
    -- 착용 중인 것(모자·안경·가방)
    "wear"         TEXT[]         NOT NULL DEFAULT '{}',
    -- 🔴 방 안 배치를 JSON 한 칸에 둔다. 위치 정보가 아니라 **화면 좌표**다 —
    --    컬럼으로 펼치면 이름만 보고 위치정보로 오해될 수 있다 (규제 스캔 오탐)
    "layout"       JSONB          NOT NULL DEFAULT '{}',
    "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "child_room_pkey" PRIMARY KEY ("child_id")
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."child_items" TO app_activity;
GRANT SELECT, INSERT, UPDATE, DELETE ON "activity"."child_room"  TO app_activity;
ALTER TABLE "activity"."child_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity"."child_room"  ENABLE ROW LEVEL SECURITY;
CREATE POLICY child_scope ON "activity"."child_items"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
CREATE POLICY child_scope ON "activity"."child_room"
  USING (child_id::text = ANY (string_to_array(current_setting('app.child_ids', true), ',')));
