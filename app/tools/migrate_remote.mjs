/**
 * 마이그레이션을 **원격 DB**(Supabase)에 올린다 — 어긋남 대장 D62.
 *
 * 🔴 `tools/dev_db.sh` 는 **도커 전용**이다(`docker exec psql`). 로컬 컨테이너에는
 *    쓰지만 원격에는 못 쓴다. 같은 규칙(`_ff_applied` 로 적용 여부를 센다)을
 *    네트워크로 옮긴 것이 이 파일이다.
 *
 * 🔴 **`DIRECT_URL` 로 붙는다.** 풀러(6543)는 트랜잭션 모드라 DDL 이 깨진다 (ADR-T04).
 *
 * 🔴 **한 파일이 한 트랜잭션이다.** 중간에 실패하면 그 파일은 통째로 되돌아간다 —
 *    반쯤 적용된 스키마가 제일 고치기 어렵다.
 *
 * 🔴 **인자 없이 부르면 미리 보기다.** 되돌릴 수 없는 일은 먼저 보여준다.
 *
 * 사용: npm --prefix app run db:remote            무엇이 올라갈지 본다
 *       npm --prefix app run db:remote -- --write  실제로 올린다
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// 🔴 **`app/tools/` 에 둔다.** ESM 은 «스크립트 위치»를 기준으로 패키지를 찾는다 —
//    저장소 루트의 `tools/` 에 두면 `app/node_modules` 를 못 본다
const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(APP, "prisma", "migrations");
const write = process.argv.includes("--write");

const url = process.env.DIRECT_URL;
if (!url) { console.error("DIRECT_URL 이 없다. app/.env 를 채운다"); process.exit(1); }

const host = new URL(url).hostname;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log(`${write ? "올린다" : "미리 보기 (바꾸지 않는다)"} — ${host}\n`);

await client.query(`create table if not exists _ff_applied(name text primary key, at timestamptz default now())`);
const done = new Set((await client.query("select name from _ff_applied")).rows.map(r => r.name));

const all = readdirSync(DIR).filter((d) => /^\d/.test(d)).sort();
const todo = all.filter((n) => !done.has(n));
console.log(`  파일 ${all.length}개 · 이미 올라간 것 ${done.size}개 · 올릴 것 ${todo.length}개\n`);
if (todo.length === 0) { console.log("  올릴 것이 없다"); await client.end(); process.exit(0); }

let ok = 0;
for (const name of todo) {
  if (!write) { console.log(`  · ${name}`); continue; }
  const sql = readFileSync(join(DIR, name, "migration.sql"), "utf8");
  try {
    // 🔴 한 파일이 한 트랜잭션이다. 반쯤 적용된 스키마를 만들지 않는다
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into _ff_applied(name) values ($1)", [name]);
    await client.query("commit");
    console.log(`  ✅ ${name}`);
    ok++;
  } catch (e) {
    await client.query("rollback");
    console.error(`  🔴 ${name} — ${e.message}`);
    console.error(`\n  여기서 멈춘다. 앞의 ${ok}개는 올라갔고 이 파일은 통째로 되돌렸다.`);
    await client.end();
    process.exit(1);
  }
}
if (!write) console.log("\n  실제로 올리려면 --write 를 붙인다");
else console.log(`\n  ${ok}개 올렸다`);
await client.end();
