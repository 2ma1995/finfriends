---
name: 301-server-boundary-rules
description: Server Action · Route Handler · RSC 중 무엇을 쓸지 결정한다. 서버 코드를 새로 만들 때 읽는다.
---

# 서버 경계 규칙

C-TEC-002가 진입점을 **셋으로 제한**한다. **취향이 아니라 표로 결정한다.**

---

## 1. 선택표

| 상황 | 선택 | 위치 |
| --- | --- | --- |
| 화면 렌더용 읽기 | **RSC 직접 조회** | `src/app/(guardian)/…` · `(child)/…` |
| 사용자 변경 작업 | **Server Action** | `src/app/actions/` |
| 외부 시스템 수신 (제휴사 웹훅) | **Route Handler** | `src/app/api/webhooks/payment` |
| 외부 시스템 조회 프록시 | **Route Handler** | `src/app/api/partner/*` |
| 배치 실행 | **Route Handler** | `src/app/api/cron/<job>` |
| 캐시 가능한 GET | **Route Handler** | Server Action은 항상 POST라 HTTP 캐시가 없다 |

## 2. 진입점은 19개로 확정돼 있다

`docs/tech-design-docs/[SRS]FinFriends-SRS-Tech-v1_0.md` **§6.1 서버 진입점 목록**이 원본이다.
**표에 없는 진입점을 만들지 않는다.** 필요하면 SRS를 먼저 고친다.

| 구분 | 개수 | 예 |
| --- | :-: | --- |
| Server Action | 10군 | `completeConsent` · `approveMission` · `createPlanCard` · `confirmRetro` … |
| RSC (Read) | 1군 | 성장 나무 · 월간 숲 · 소비 내역 조회 |
| Route Handler — 외부 | 2 | `/api/webhooks/payment` · `/api/partner/settlements` |
| Route Handler — Cron | 6 | `inactivity` · `star-reconcile` · `wpa-batch` · `compliance-scan` · `sentence-pool` · `cycle-reset` |

## 3. Server Action 규약

**Server Action은 공개 엔드포인트와 동등하다.** 클라이언트에서 호출된다는 사실이 보호가 되지 않는다.

```
1. 첫 줄에서 인가를 확인한다 — assertActor(...)
2. 입력을 Zod 스키마로 검증한다 — contracts/ 의 것을 쓴다
3. 실패는 예외가 아니라 ActionResult 로 반환한다
4. 상태 변경과 계측 이벤트를 같은 트랜잭션에 넣는다
5. 외부 호출(제휴사·푸시)은 커밋 뒤에 한다
```

**아동 화면 경로는 동의 게이트를 서버에서 확인한다.** 클라이언트 판정은 규제 요건을 충족하지 못한다.

## 4. Cron Route Handler 규약

```
1. X-Cron-Secret 검증 — 불일치 시 404 (401·403은 존재를 노출한다)
2. run_key 로 멱등 — 배치는 재실행될 수 있다
3. 실행 이력을 남긴다 — 실패가 조용히 지나가면 안 된다
4. 실패는 알림으로 연결한다
```

## 5. 모듈 경계

```
src/modules/<name>/index.ts   ← 유일한 공개 표면
```

- `modules/star/internal/...` 를 다른 모듈이 import하면 **`prebuild` 가 빌드를 실패**시킨다
- 모듈 간에는 **`contracts/` 의 타입만** 주고받는다. Prisma 모델을 모듈 밖으로 내보내지 않는다
- **모듈 간 내부 HTTP 호출을 하지 않는다.** 함수를 직접 부른다

## 6. 책임 경계 — 자주 무너지는 지점

| 모듈 | 하지 않는 것 |
| --- | --- |
| `learning` | **별을 직접 지급하지 않는다** — `star` 에 트리거 코드를 넘긴다 |
| `star` | **어떤 행동이 실천인지 판단하지 않는다** — 트리거 코드만 받는다 |
| `growth` | **실천을 인정하지 않는다** — 결과를 읽기만 한다 |
| `planspend` | 결제를 발생시키지 않는다 |
| `events` | 지표의 의미를 해석하지 않는다 |

> **가장 자주 무너지는 곳은 `learning` 이 편의상 별을 직접 지급하는 것**이다. 그러면 경로 구분
> (LEARNING/PRACTICE)이 두 곳에 생기고 **WPA 분자가 조용히 오염된다.**
