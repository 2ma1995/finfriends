-- 저금을 **세 개까지** — 어긋남 대장 D61. 사용자 결정
--
-- `20260901000019_savings` 가 「한 번에 하나만」을 **유니크 인덱스**로 걸었다.
-- 그 주석이 이랬다 — *"여러 개를 동시에 굴리면 아이가 무엇을 지키는지 모른다"*.
-- 걱정 자체는 맞다. 다만 **하나는 너무 좁다** — 갖고 싶은 것도 셋까지 두는데
-- 저금만 하나면 아이가 목표를 나눠 모을 수가 없다.
--
-- 🔴 **셋으로 정한 이유는 적금이 «매주» 넣는 것이기 때문이다.** 개수가 늘수록
--    지킬 일이 늘고, 하나만 잊어도 그게 실패로 남는다. 「약속하고 지키기」를
--    배우는 자리에서 지킬 수 없는 개수를 열어 주면 배우는 것이 실패뿐이다.
--
-- 🔴 **유니크 인덱스로는 「셋」을 못 센다.** 부분 유니크는 1개까지만 표현한다.
--    개수 제한은 **트리거**로 옮긴다 — 애플리케이션(`listOpen().length >= MAX_OPEN`)만
--    믿으면 두 요청이 동시에 들어올 때 넷이 된다.

DROP INDEX IF EXISTS "activity"."savings_one_open_per_child";

CREATE OR REPLACE FUNCTION activity.savings_max_open() RETURNS trigger AS $$
DECLARE n int;
BEGIN
  -- 살아 있는 것만 센다. 끝난 것 · 깬 것 · 반려된 것은 자리를 차지하지 않는다
  SELECT count(*) INTO n
    FROM activity.savings_plans
   WHERE child_id = NEW.child_id
     AND state IN ('REQUESTED', 'ACTIVE')
     AND id <> NEW.id;
  IF n >= 3 THEN
    RAISE EXCEPTION 'savings_max_open: 아이당 살아 있는 저금은 3개까지다 (지금 %)', n
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- 🔴 `UPDATE` 에도 건다. 끝난 저금을 `ACTIVE` 로 되돌리는 경로가 생기면
--    `INSERT` 만 막아서는 넷이 된다
CREATE TRIGGER savings_max_open_trg
  BEFORE INSERT OR UPDATE OF state, child_id ON activity.savings_plans
  FOR EACH ROW EXECUTE FUNCTION activity.savings_max_open();
