# [운영] 마이그레이션 실행 절차

**문서 ID:** OPS-FINFRIENDS-MIG-001 · **날짜:** 2026-08-31
**근거:** `INF-003` · `DAT-001` · `DAT-002` · `ADR-T04` · `REQ-TEC-005` · `REQ-TEC-009`

> 🔴 **승인 없이 운영 마이그레이션을 돌리지 않는다.** `INF-003` 의 명시 항목이다.

## 커넥션이 둘인 이유

| 변수 | 포트 | 쓰는 곳 | 왜 |
| --- | :-: | --- | --- |
| `DATABASE_URL` | **6543** | 앱 런타임 (풀러 · 트랜잭션 모드) | 서버리스에서 커넥션이 마르지 않게 |
| `DIRECT_URL` | **5432** | 마이그레이션 (직결) | **풀러의 트랜잭션 모드에서는 DDL 이 깨진다** |

같은 값을 넣으면 마이그레이션이 조용히 실패하거나 절반만 적용된다.
Prisma 7 부터 이 두 값은 스키마가 아니라 **`prisma.config.ts`** 가 갖는다.

## 순서

```bash
# 1. 로컬에서 먼저 — 컨테이너를 새로 띄워 처음부터 적용하고 규제 4항목을 시험한다
tools/verify_schema.sh

# 2. 스키마를 고쳤으면 SQL 을 다시 뽑는다
cd app && npm run db:diff > prisma/migrations/<타임스탬프>_<이름>/migration.sql

# 3. 운영 — 🔴 승인 후에만
cd app && npm run db:migrate      # prisma migrate deploy
```

## 마이그레이션 3종

| 순서 | 무엇 | 왜 raw SQL 인가 |
| :-: | --- | --- |
| `..._init` | 테이블 · 열거형 · 인덱스 | Prisma 생성물 |
| `..._rls_and_roles` | 역할 2종 · GRANT · RLS 정책 · 금지 필드 스캔 함수 | **Prisma 는 역할·정책을 모델링하지 않는다** |
| `..._app_events_partitions` | 주차 파티셔닝 · 파티션 생성 함수 | **Prisma 는 파티션을 관리하지 못한다** (REQ-TEC-004 예외) |

## 🔴 스키마가 구조로 지키는 것 4가지

나중에 고칠 수 있는 것이 아니다. `tools/verify_schema.sh` 가 매번 실제로 시험한다.

| # | 항목 | 어떻게 | 확인 |
| :-: | --- | --- | --- |
| ① | **결합 조회 0건** (REQ-NF-009 · S3) | 스키마를 `identity` / `activity` 로 나누고 **역할도 나눈다.** 앱 역할이 상대 스키마에 `USAGE` 가 없다 | `app_activity` 로 `identity` 조회 → **permission denied** |
| ② | **좌표 · 얼굴 필드 0건** (S1 · S2) | 컬럼을 두지 않고, `assert_no_forbidden_columns()` 가 그 **부재**를 검사한다 | 좌표 컬럼을 넣으면 즉시 검출 |
| ③ | **별↔저금통 전환 경로 0건** (P-21 · S4) | 전환 컬럼·심볼을 두지 않는다. 같은 스캔이 본다 | `cash·withdraw·convert` 패턴 0건 |
| ④ | **중복 지급 0건** (REQ-NF-006) | `star_ledger.idempotency_key` **unique** | 같은 키로 두 번 INSERT → 두 번째가 거부 |

> **`ChildAccount` 에 `activity` 로 가는 Prisma 관계가 없다.** 빠뜨린 것이 아니다 —
> 관계를 걸면 조인이 가능해지고 ①이 무너진다. 화면이 이름을 필요로 하면
> **애플리케이션 계층에서 두 번 조회해 합친다** (ADR-T03).

## 파티션 회전

`activity.ensure_event_partitions(weeks_ahead)` 를 **`pg_cron` 이 매일 호출**한다(`ADR-T02`).
파티션이 없는 주에 이벤트가 들어오면 INSERT 가 실패하고 **조용히 유실된다** — 그래서 미리 만든다.

```sql
select activity.ensure_event_partitions(4);   -- 4주 앞까지 확보. 새로 만든 개수를 반환
```

## 아직 안 한 것

- **Supabase 프로젝트 연결** — 계정이 필요하다. `.env.example` 를 채우면 된다
- `pg_cron` 등록 — `INF-005` 범위
- 시드 데이터 — `DAT-003`(학습 콘텐츠 · 회고 문장 풀) · `DAT-004`(업종 사전)
