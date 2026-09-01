#!/bin/zsh
# 스키마 규제 검사 — DAT-001 · REQ-TEC-009 · REQ-NF-009
#
# 로컬 Postgres 에 마이그레이션을 전부 적용하고 **규제 4항목이 실제로 막히는지** 시험한다.
# 스키마 파일을 읽는 것으로는 알 수 없다 — 권한과 제약은 DB 가 판정한다.
#
#   tools/verify_schema.sh          # 컨테이너를 새로 띄워 처음부터
#
# 🔴 **포트를 열지 않는다.** 질의를 전부 `docker exec` 로 하므로 필요가 없다.
#    한동안 55432 를 열었는데 개발 DB(`ff-dev-pg`)가 그 포트를 쓰고 있어
#    **이 게이트가 아예 못 떴다** — 그래서 오래 안 돌아간 채로 썩었다.
set -e
ROOT="${0:a:h:h}"
C="${PG_CONTAINER:-ff-pg}"
DB=finfriends
fail=0

docker info >/dev/null 2>&1 || { echo "Docker 데몬이 꺼져 있다"; exit 1 }

echo "── postgres:16 기동"
docker rm -f "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" -e POSTGRES_PASSWORD=ff -e POSTGRES_DB=$DB postgres:16-alpine >/dev/null
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
# identity 4표 — guardian_accounts · child_accounts · device_sessions(아동 모드, D5)
#                push_subscriptions(웹 푸시, D56)
# 🔴 **왜 identity 인가** — 보호자 기기 정보다. 아이 활동과 조인하지 않는다 (REQ-NF-009).
#    이 숫자를 늘릴 때는 늘 그 질문에 먼저 답한다. 습관적으로 올리면 분리가 무너진다.
# 🔴 **정확한 수를 못박는다.** 표가 늘 때마다 사람이 「이게 이 스키마에 맞나」를
#    다시 판정하게 만드는 것이 이 검사의 목적이다 — 자동으로 따라가면 뜻이 없다.
#    identity 5 = guardian_accounts · child_accounts · device_sessions · child_invites · push_subscriptions
#    🔴 늘릴 때 답할 질문: **아이 활동과 조인하지 않는가** (REQ-NF-009).
IDENT_N=5; ACT_N=19
actual="$(q "select (select count(*) from information_schema.tables where table_schema='identity')||'|'||(select count(*) from information_schema.tables where table_schema='activity' and table_name not like 'app_events_2%')")"
if [[ "$actual" != "$IDENT_N|$ACT_N" ]]; then
  print "   ❌ 스키마 2분할 — 기대 $IDENT_N|$ACT_N · 실제 $actual"
  # 무엇이 늘었는지 보여준다. 숫자만 보면 다음 사람이 또 헤맨다
  q "select table_schema||'.'||table_name from information_schema.tables where table_schema in ('identity','activity') and table_name not like 'app_events_2%' order by 1" | sed 's/^/        /'
  fail=1
else
  print "   ✅ 스키마 2분할 (identity ${IDENT_N} · activity ${ACT_N})"
fi
# 🔴 **승인된 예외 1건.** 검사기는 「의심스러운 이름」을 모아 주고,
#    **무엇이 승인된 예외인지는 여기서 사람이 읽고 판정한다** —
#    그 판정을 DB 함수에 묻으면 diff 에서 안 보이고 아무도 다시 안 본다.
#
#    `missions.payout_won` — 보호자가 미션에 건 **용돈 금액**이다 (마이그레이션 22 · D30).
#    `payout` 이라는 낱말에 걸렸을 뿐 **별↔현금 전환이 아니다** (P-21):
#    별(`reward`)은 항상 1로 고정이고 금액은 보호자가 따로 정한다 —
#    둘 사이에 환율이 없다. 실제 돈은 앱 밖에서 오가고 원장은 그 사실만 적는다 (D18).
#
#    🔴 이 목록에 줄을 더할 때는 **왜 전환이 아닌지**를 먼저 적는다. 못 적으면 예외가 아니다.
ALLOWED="('missions','payout_won')"
q_forbidden() { q "select count(*) from activity.assert_no_forbidden_columns() where (table_name, column_name) not in ($ALLOWED)" }
check "금지 필드 0건 (좌표 · 얼굴 · 현금 전환)" "0" "$(q_forbidden)"
[[ "$(q "select count(*) from activity.assert_no_forbidden_columns() where (table_name, column_name) in ($ALLOWED)")" == "1" ]] \
  || { print "   ❌ 승인 예외가 사라졌다 — 목록을 지워야 한다"; fail=1 }

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
check "금지 필드를 넣으면 검출된다" "1" "$(q_forbidden)"
docker exec -i "$C" psql -U postgres -d $DB -c "alter table activity.plan_cards drop column latitude" >/dev/null

echo "── RLS · 파티션"
# 🔴 **전부 켜져 있어야 한다.** 11개로 못박아 뒀더니 표가 19개로 늘어도
#    검사가 「11개면 통과」라고 말했다 — 새 표에 RLS 가 빠져도 안 걸렸다.
#    이제 **켜진 수 = 표 수**를 본다. 표를 더하면 자동으로 요구된다.
rls="$(q "select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where c.relrowsecurity and schemaname in ('identity','activity')")"
tot="$(q "select count(*) from pg_tables where schemaname in ('identity','activity') and tablename not like 'app_events_2%'")"
if [[ "$rls" == "$tot" ]]; then print "   ✅ RLS 전 테이블 ${tot}개"; else
  print "   ❌ RLS 가 빠진 표가 있다 — 켜짐 $rls · 전체 $tot"
  q "select schemaname||'.'||tablename from pg_tables t join pg_class c on c.relname=t.tablename where not c.relrowsecurity and schemaname in ('identity','activity') and tablename not like 'app_events_2%' order by 1" | sed 's/^/        /'
  fail=1
fi
check "주차 파티션 6주분" "6" "$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_inherits i on i.inhrelid=c.oid where n.nspname='activity' and c.relkind='r'")"

[[ $fail -eq 0 ]] && { echo "전부 통과"; exit 0 } || { echo "실패"; exit 1 }
