---
name: 101-build-and-env-setup
description: 빌드 · 환경 변수 · 로컬 개발 환경 구성. 환경이 깨졌을 때 읽는다.
---

# 빌드와 환경

## 1. 환경 변수

| 키 | 용도 | 주의 |
| --- | --- | --- |
| `DATABASE_URL` | 앱 런타임 — **풀러**(트랜잭션 모드) | |
| `DIRECT_URL` | 마이그레이션 — **직결** | 위와 **같으면 안 된다** |
| `SUPABASE_URL` · `SUPABASE_ANON_KEY` | 클라이언트 허용 | |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | 클라이언트 번들 반입 시 **빌드 실패** |
| `CRON_SECRET` | Cron 인증 | 없으면 배치가 전부 404 |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` | 웹 푸시 | |
| `PARTNER_API_BASE` · `PARTNER_API_KEY` · `PARTNER_WEBHOOK_SECRET` | 제휴사 | |
| `OPS_WEBHOOK_URL` | 온콜 알림 | **D-02 승인 시** |
| `AI_MODEL` · `GOOGLE_GENERATIVE_AI_API_KEY` | **미사용** | 자리만 있다 |

**로컬 · 프리뷰 · 운영 3환경의 키 집합이 같아야 한다.** 누락은 런타임이 아니라 **빌드에서** 잡는다.

## 2. 시크릿을 코드에 두지 않는다

```
❌ const MODEL = "gemini-..."
✅ process.env.AI_MODEL
```

`prebuild` 가 하드코딩을 검출한다.

## 3. prebuild 게이트 5종

빌드 전에 돌고, **하나라도 걸리면 배포가 차단**된다. 외부 CI가 없으므로 이것이 유일한 게이트다.

| # | 검사 | 실패하면 |
| :-: | --- | --- |
| 1 | 모듈 경계 | `index.ts` 외 경로 교차 import를 지운다 |
| 2 | raw 쿼리 | Prisma로 바꾼다. 마이그레이션·파티션만 예외 |
| 3 | UI 의존성 | 허용 목록 밖 킷을 제거한다. 예외는 Lottie 1건 |
| 4 | 금지 심볼 | **전환 경로를 지운다.** 플래그로 감싸도 실패한다 |
| 5 | 금지 필드 | 좌표·얼굴 컬럼을 지운다 |

**검사 시간은 30초 이내를 목표로 한다.** 느리면 개발이 느려지고 결국 꺼진다.

## 4. 로컬 개발

```bash
supabase start                  # 로컬 Supabase
npx prisma migrate dev          # DIRECT_URL 로 실행됨
npm run dev
```

배치를 로컬에서 확인하려면 Cron 엔드포인트를 **시크릿 헤더와 함께** 직접 호출한다.

## 5. 배포

**Git Push가 곧 배포다.** 외부 CI를 만들지 않는다.
`prebuild` 실패 = 빌드 실패 = **배포 차단**. 이것이 설계된 동작이다(ADR-T08).
