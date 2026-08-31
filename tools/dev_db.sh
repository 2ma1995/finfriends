#!/bin/zsh
# 개발용 로컬 Postgres — 마이그레이션까지 적용하고 띄운다.
#
# 🔴 Supabase 이관 전 임시다. 실제 스키마·마이그레이션은 그대로 쓰므로
#    이관 시 바뀌는 것은 **접속 문자열뿐**이다 (app/.env).
#
#   tools/dev_db.sh          기동 + 마이그레이션
#   tools/dev_db.sh reset    지우고 처음부터
set -e
ROOT="${0:a:h:h}"
C="${PG_CONTAINER:-ff-dev-pg}"
DB=finfriends

docker info >/dev/null 2>&1 || { echo "Docker 데몬이 꺼져 있다. Docker Desktop 을 켠다"; exit 1 }

if [[ "$1" == "reset" ]]; then docker rm -f "$C" >/dev/null 2>&1 || true; fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$C"; then
  docker run -d --name "$C" -e POSTGRES_PASSWORD=ff -e POSTGRES_DB=$DB -p 55432:5432 postgres:16-alpine >/dev/null
  echo "postgres:16 기동 (localhost:55432)"
elif [[ -z "$(docker ps -q -f name=^${C}$)" ]]; then
  docker start "$C" >/dev/null; echo "기존 컨테이너 재기동"
else
  echo "이미 떠 있다"
fi

until docker exec "$C" psql -U postgres -d $DB -c "select 1" >/dev/null 2>&1; do sleep 2; done

for d in "$ROOT"/app/prisma/migrations/*/; do
  n=$(basename "$d")
  # 이미 적용됐으면 건너뛴다 — 마이그레이션은 멱등하지 않다
  if docker exec "$C" psql -U postgres -d $DB -qtA \
      -c "select 1 from information_schema.tables where table_schema='public' and table_name='_ff_applied'" | grep -q 1; then
    docker exec "$C" psql -U postgres -d $DB -qtA -c "select 1 from _ff_applied where name='$n'" | grep -q 1 && { echo "   · $n (적용됨)"; continue }
  else
    docker exec "$C" psql -U postgres -d $DB -q -c "create table if not exists _ff_applied(name text primary key, at timestamptz default now())" >/dev/null
  fi
  docker exec -i "$C" psql -U postgres -d $DB -v ON_ERROR_STOP=1 -q < "$d/migration.sql"
  docker exec "$C" psql -U postgres -d $DB -q -c "insert into _ff_applied(name) values ('$n')" >/dev/null
  echo "   ✅ $n"
done

echo "DATABASE_URL=postgresql://postgres:ff@localhost:55432/finfriends"
