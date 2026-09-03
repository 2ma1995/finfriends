-- 미션 리마인드·자동 완료를 정해진 시각에 — 어긋남 대장 D77
--
-- 🔴 **규칙을 SQL 로 다시 쓰지 않는다.** `pg_cron` 이 SQL 만 돌릴 수 있다고
--    「24시간」·「72시간」 규칙을 여기 옮기면 **같은 규칙이 두 벌**이 된다.
--    이 저장소가 반복해서 겪은 함정이다(`D24` — 길이 둘이면 한쪽만 고쳐진다).
--    그래서 `pg_net` 으로 **앱의 문을 두드리고**, 규칙은 앱에 한 벌만 둔다.
--
-- 🔴 **주소와 열쇠를 여기 적지 않는다.** 마이그레이션은 저장소에 남는다 —
--    열쇠를 적으면 그 순간 공개된다. 값은 `activity.cron_setting` 에 넣고,
--    **넣는 일은 사람이 한 번** 한다 (운영 문서에 절차를 적어 뒀다).
--
-- 🔴 **6시간마다다.** 리마인드가 24시간, 자동 완료가 72시간 기준이라
--    하루 한 번(무료 Vercel Cron)으로는 최대 24시간이 밀린다 — ADR-T02 가
--    `pg_cron` 을 고른 이유가 그것이다.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 주소·열쇠를 담는 자리. 값은 사람이 따로 넣는다
CREATE TABLE IF NOT EXISTS activity.cron_setting (
  key   text PRIMARY KEY,
  value text NOT NULL
);

/*
  🔴 **설정이 없으면 «아무 일도 안 한다».** 안 넣은 채 배포되면 조용히 넘어가야지,
     빈 주소로 두드려 오류를 쌓으면 안 된다. 넣는 순간부터 돈다.
*/
CREATE OR REPLACE FUNCTION activity.poke_mission_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base   text;
  secret text;
BEGIN
  SELECT value INTO base   FROM activity.cron_setting WHERE key = 'app_url';
  SELECT value INTO secret FROM activity.cron_setting WHERE key = 'cron_secret';
  IF base IS NULL OR secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := base || '/api/cron/missions',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || secret),
    body    := '{}'::jsonb
  );
END;
$$;

-- 🔴 같은 이름이 두 번 잡히지 않게 먼저 걷는다. 재적용해도 안전해야 한다
SELECT cron.unschedule('finfriends_mission_cron')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finfriends_mission_cron');

SELECT cron.schedule(
  'finfriends_mission_cron',
  '0 */6 * * *',
  $$SELECT activity.poke_mission_cron()$$
);
