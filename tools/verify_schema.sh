#!/bin/zsh
# 스키마 규제 검사 — DAT-001 · REQ-TEC-009 · REQ-NF-009
#
# 로컬 Postgres 에 마이그레이션을 전부 적용하고 **규제 4항목이 실제로 막히는지** 시험한다.
# 스키마 파일을 읽는 것으로는 알 수 없다 — 권한과 제약은 DB 가 판정한다.
#
#   tools/verify_schema.sh          # 컨테이너를 새로 띄워 처음부터
set -e
ROOT="${0:a:h:h}"
C="${PG_CONTAINER:-ff-pg}"
DB=finfriends
fail=0

docker info >/dev/null 2>&1 || { echo "Docker 데몬이 꺼져 있다"; exit 1 }

echo "── postgres:16 기동"
docker rm -f "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" -e POSTGRES_PASSWORD=ff -e POSTGRES_DB=$DB -p 55432:5432 postgres:16-alpine >/dev/null
until docker exec "$C" psql -U postgres -d $DB -c "select 1" >/dev/null 2>&1; do sleep 2; done

echo "── 마이그레이션 적용"
for d in "$ROOT"/app/prisma/migrations/*/; do
  docker exec -i "$C" psql -U postgres -d $DB -v ON_ERROR_STOP=1 -q < "$d/migration.sql" >/dev/null
  echo "   ✅ $(basename $d)"
done

q() { docker exec -i "$C" psql -U postgres -d $DB -qtA -c "$1" 2>&1 }
check() {  # check <설명> <기대값> <실제값>
  if [[ "$2" == "$3" ]]; then print "   ✅ $1"; else print "   ❌ $1 — 기대 $2 · 실제 $3"; fail=1; fi
}

echo "── 규제 4항목"
# identity 3표 — guardian_accounts · child_accounts · device_sessions(아동 모드, D5)
check "스키마 2분할 (identity 3 · activity 9)" "3|9" \
  "$(q "select (select count(*) from information_schema.tables where table_schema='identity')||'|'||(select count(*) from information_schema.tables where table_schema='activity' and table_name not like 'app_events_2%')")"
check "금지 필드 0건 (좌표 · 얼굴 · 현금 전환)" "0" "$(q "select count(*) from activity.assert_no_forbidden_columns()")"

# 결합 조회 — app_activity 가 identity 를 못 본다
docker exec -i "$C" psql -U postgres -d $DB -c "grant app_activity to postgres" >/dev/null
r=$(docker exec -i "$C" psql -U postgres -d $DB -qtA -c "set role app_activity; select count(*) from identity.child_accounts" 2>&1 | head -1)
[[ "$r" == *"permission denied"* ]] && print "   ✅ 결합 조회 차단 (권한 오류로 거부)" || { print "   ❌ 결합 조회가 통과했다 — $r"; fail=1 }

# 멱등 — 같은 키로 두 번 지급되지 않는다
docker exec -i "$C" psql -U postgres -d $DB -q >/dev/null 2>&1 <<'SQL' || true
insert into activity.star_ledger (id,child_id,delta,trigger_code,balance_after,idempotency_key)
values (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',1,'MISSION_APPROVED',1,'verify-k');
insert into activity.star_ledger (id,child_id,delta,trigger_code,balance_after,idempotency_key)
values (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',1,'MISSION_APPROVED',2,'verify-k');
SQL
check "멱등 — 중복 지급 0건" "1" "$(q "select count(*) from activity.star_ledger where idempotency_key='verify-k'")"

# 금지 필드를 넣으면 잡히는가 — 검사기가 살아 있는지 자체 시험
docker exec -i "$C" psql -U postgres -d $DB -c "alter table activity.plan_cards add column latitude double precision" >/dev/null
check "금지 필드를 넣으면 검출된다" "1" "$(q "select count(*) from activity.assert_no_forbidden_columns()")"
docker exec -i "$C" psql -U postgres -d $DB -c "alter table activity.plan_cards drop column latitude" >/dev/null

echo "── RLS · 파티션"
check "RLS 켜진 테이블 11개" "11" "$(q "select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where c.relrowsecurity and schemaname in ('identity','activity')")"
check "주차 파티션 6주분" "6" "$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_inherits i on i.inhrelid=c.oid where n.nspname='activity' and c.relkind='r'")"

[[ $fail -eq 0 ]] && { echo "전부 통과"; exit 0 } || { echo "실패"; exit 1 }
