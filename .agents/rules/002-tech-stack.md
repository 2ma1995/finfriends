# 002 — 기술 스택

## 제약 (C-TEC-001~007)

`AGENTS.md` 의 표를 원본으로 한다. 여기서는 **판단이 갈리는 지점**만 다룬다.

## 진입점 선택

| 상황 | 선택 | 위치 |
| --- | --- | --- |
| 화면 렌더용 읽기 | **RSC 직접 조회** | `src/app/(guardian)/…` · `(child)/…` |
| 사용자 변경 작업 | **Server Action** | `src/app/actions/` |
| 제휴사 웹훅 수신 | **Route Handler** | `src/app/api/webhooks/payment` |
| 제휴사 조회 프록시 | **Route Handler** | `src/app/api/partner/…` |
| 배치 실행 | **Route Handler** | `src/app/api/cron/<job>` |

**진입점 19개가 반영판 §6.1에 확정돼 있다. 표에 없는 진입점을 만들지 않는다.**

## 모듈 구조

```
src/
  app/
    (guardian)/   보호자 화면 — 나무 · 숲 · 아이통장 · 소비내역 · 온보딩
    (child)/      아동 화면 — 홈 · 학습 · 내통장 · 계획카드 · 회고
    actions/      Server Actions
    api/cron/*    배치 진입점 (pg_cron 전용 · 시크릿 헤더)
    api/webhooks/payment
    api/partner/*
  modules/
    consent/ learning/ practice/ star/ growth/ planspend/ notify/ partner/ events/
  contracts/      모듈 간 공유 계약 (Zod DTO · ErrorCode · ActionResult)
  db/             Prisma 클라이언트 · 스키마 · 마이그레이션
```

**규약 세 가지**

1. 모듈은 `index.ts` 로만 노출한다. `modules/star/internal/...` 를 다른 모듈이 import하면 **빌드 실패**
2. Server Action은 **공개 엔드포인트와 동등**하다. 각 액션은 **첫 줄에서 인가를 확인**한다
3. 모듈 간에는 `contracts/` 의 타입만 주고받는다. **Prisma 모델을 모듈 밖으로 내보내지 않는다**

## 데이터

| 항목 | 규칙 |
| --- | --- |
| 스키마 분리 | `identity`(계정 2종) / `activity`(나머지 9종). **앱 역할이 동시에 조인할 수 없다** |
| RLS | 보호자 소유 데이터만 접근 |
| 커넥션 | 앱은 **풀러**(트랜잭션 모드) · 마이그레이션은 **직결**(`DIRECT_URL`) |
| 멱등 | `star_ledger` · `app_events` 에 `idempotency_key` **유니크 제약** |
| 파티셔닝 | `app_events` 주차 단위. **raw SQL 마이그레이션으로만** 관리 (REQ-TEC-004 예외) |
| 금지 필드 | 좌표 · 얼굴 이미지 · 별↔저금통 전환 컬럼 — **부재가 설계다** |

## 배치 — `pg_cron`

```
Supabase pg_cron → pg_net → POST /api/cron/<job>  (X-Cron-Secret)
```

| 작업 | 주기 |
| --- | :-: |
| 72시간 미접속 판정 | **4시간** — 6시간 지연 요건을 맞추려면 그보다 짧아야 한다 |
| 별 원장 정산 | 일 1회 |
| WPA 집계 | 주 1회 (ISO 주 마감 D+1) |
| 규제·보안 스캔 | 일 1회 |
| 회고 문장 풀 잔여 | 일 1회 |
| 나무 주기 초기화 | 일 1회 |

**시크릿 불일치 시 404를 반환한다** — 401·403으로 존재를 알리지 않는다.
**배치는 재실행될 수 있다.** `run_key` 로 멱등을 보장한다.

## 게이트 — `prebuild` 5종

외부 CI를 두지 않으므로 **Vercel 빌드 단계**에서 막는다.

| # | 검사 | 실패 조건 |
| :-: | --- | --- |
| 1 | 모듈 경계 | `index.ts` 외 경로 교차 import |
| 2 | raw 쿼리 | 앱 코드의 raw SQL (마이그레이션·파티션 제외) |
| 3 | UI 의존성 | 허용 목록 밖 컴포넌트 킷 |
| 4 | 금지 심볼 | 별↔저금통 전환 함수·API |
| 5 | 금지 필드 | Prisma 스키마의 좌표·얼굴 이미지 |

**기능 플래그로 막는 방식은 허용되지 않는다.** 플래그는 켜질 수 있다.

## 환경 변수

| 키 | 용도 |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | 앱 풀러 / 마이그레이션 직결 — **서로 달라야 한다** |
| `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키는 **서버 전용** |
| `CRON_SECRET` | Cron 엔드포인트 인증 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 |
| `PARTNER_API_BASE` · `PARTNER_API_KEY` · `PARTNER_WEBHOOK_SECRET` | 제휴사 |
| `OPS_WEBHOOK_URL` | 온콜 알림 — **D-02 승인 시** |
| `AI_MODEL` · `GOOGLE_GENERATIVE_AI_API_KEY` | **미사용** (REQ-TEC-015 유보) |

**시크릿·엔드포인트·모델명을 코드에 하드코딩하지 않는다.** 로컬·프리뷰·운영 3환경의 키 집합이 같아야 한다.
