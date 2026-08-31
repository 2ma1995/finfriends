# 핀프렌즈(FinFriends) — Agent Instructions

여러 AI 코딩 도구(Claude Code · Cursor · Antigravity · Gemini CLI · Codex 등)가 공통으로 읽는
최상위 규칙 파일이다. 도구별 설정은 이 내용을 중복하지 않고 참조한다.

---

## 프로젝트

아동이 배운 금융 지식을 **실제 돈 행동으로 잇고, 그 변화를 보호자가 읽을 수 있게** 하는 서비스다.
가르치고 끝내지 않고 **실천을 조건으로 성장을 판정**하는 것이 이 제품의 차별점이다.

**이 저장소는 기획이 끝난 상태다.** SRS 2종·설계 문서·태스크 68건·실행 일정이 확정돼 있다.
할 일은 `docs/tasks/<TASK-ID>.md` 에 이미 적혀 있다. **없는 기능을 만들지 않는다.**

## 기술 제약 (C-TEC-001~007)

발주 측이 확정한 제약이다. 기술적으로 더 나은 대안이 있어도 **조용히 우회하지 않는다.**
제약이 요구사항을 실제로 깨뜨리는 경우는 **반영판 SRS §8 충돌 대장**에 기록하고 사람에게 판단을 요청한다.

| ID | 제약 |
| --- | --- |
| C-TEC-001 | Next.js App Router 단일 풀스택. 프론트/백엔드를 분리하지 않는다 |
| C-TEC-002 | 서버 로직은 Server Actions 또는 Route Handlers. 별도 백엔드 서버 없음 |
| C-TEC-003 | Prisma + Supabase — 로컬은 Supabase CLI, 배포는 Supabase PostgreSQL |
| C-TEC-004 | Tailwind CSS + shadcn/ui |
| C-TEC-005 | AI는 Vercel AI SDK로 외부 API 호출. 자체 추론 서버 없음 |
| C-TEC-006 | Google Gemini 기본. 환경 변수만으로 모델 교체 가능해야 한다 |
| C-TEC-007 | Vercel 단일 배포. CI 설정 없이 Git Push로 자동 배포 |

### 🔴 이 프로젝트의 AI 조항은 적용 대상이 없다

**요구사항 35건 중 AI 호출을 요구하는 항목은 0건이다.** 회고 문장은 사전 작성된 문장 풀에서
비복원 추출하고(§6.3 규칙 11), 아바타는 사전 제작 에셋이다.

C-TEC-005·006은 **REQ-TEC-015로 유보 등록만** 돼 있다. **AI를 쓰는 코드를 먼저 만들지 않는다.**
필요해 보이면 그것은 요구사항에 없는 기능이므로 **사람에게 묻는다.**

### 도입하지 않는 것 (파생 규범 D-01~D-08)

| 금지 | 대신 |
| --- | --- |
| 별도 백엔드 프로세스 · 상시 워커 | Server Actions · Route Handlers |
| 모듈 간 내부 HTTP 호출 | 함수 직접 호출 (`modules/<m>/index.ts` 경유) |
| 캐시 서버 (Redis 등) | Next.js 캐시 + PostgreSQL |
| 메시지 큐 (Kafka 등) | DB 큐 테이블 |
| **Vercel Cron · 외부 스케줄러** | **Supabase `pg_cron` + `pg_net` → `/api/cron/*`** (ADR-T02) |
| 외부 CI (GitHub Actions 등) | **`prebuild` 게이트 5종** — Vercel 빌드가 실패한다 |
| 코드에 모델 ID · 시크릿 상수 | 환경 변수 |
| shadcn/ui 컴포넌트 재구현 | `npx shadcn add` |

> **Vercel Cron을 쓰지 않는 이유** — 무료 요금제가 **일 1회**라 미접속 알림의 발송 지연
> `p95 ≤ 6시간` 을 만족하지 못한다. `pg_cron` 은 C-TEC-003 범위 안이라 스택을 넓히지 않는다.

## 서버 코드 배치

C-TEC-002가 진입점을 셋으로 제한한다. **취향이 아니라 표로 결정한다.**

| 상황 | 선택 |
| --- | --- |
| 화면 렌더용 읽기 | RSC 직접 조회 |
| 사용자 변경 작업 | Server Action (`src/app/actions/`) |
| 외부 수신 (제휴사 웹훅) | Route Handler (`src/app/api/webhooks/`) |
| 배치 실행 | Route Handler (`src/app/api/cron/`) — `X-Cron-Secret` 검증, 불일치 시 **404** |
| 캐시 가능한 GET | Route Handler — Server Action은 항상 POST라 HTTP 캐시가 없다 |

**진입점은 19개로 확정돼 있다** — 반영판 SRS §6.1. **여기에 없는 진입점을 만들지 않는다.**

**모듈 경계** — `src/modules/<name>/index.ts` 가 유일한 공개 표면이다 (REQ-TEC-002).

## 🔴 규제 — 협상 불가

아동 대상 금융 서비스다. 아래는 설계 변수가 아니라 **상수**이며 성능보다 우선한다.

| 항목 | 기준 | 검사 |
| --- | :-: | --- |
| 법정대리인 동의 전 아동 화면 진입 | **100% 차단** | 서버 판정 · `consent_gate_blocked` 즉시 알림 |
| 위치 좌표 · 얼굴 이미지 필드 | **0건** | 스키마 스캔 — 배포 시 + 일 1회 |
| 별↔저금통 전환 코드 경로 | **0건** | 정적 분석 — **기능 플래그로 막는 방식 금지** |
| 아동 식별정보 ↔ 학습·실천 결합 조회 | **0건** | `identity`/`activity` 스키마 분리 + RLS |
| 아동 계정 독립 로그인 | **0건** | 보호자 세션 하위 프로필로만 존재 |
| 별 원장 정합성 오류 | **0%** | 이중 기입 + 일일 정산 |
| ⭐ 소급 지급 성공률 | **100%** | 완료 시점 기준 · 주기 귀속 |

**허용 오차가 0이다.** "낮게 유지"가 아니라 **"없음"** 이 기준이다.

## 성능 기준 — AC 역산 상한

확정 SLO가 아니라 **수용 기준에서 역산한 상한**이다(ADR-007). **초과하면 해당 AC가 성립하지 않는다.**

| 대상 | 상한 | 근거 |
| --- | :-: | --- |
| 🌳 성장 나무 렌더 p95 | **1,250 ms** | AC-1.1이 5초 노출 — 25% 넘으면 회상 테스트가 오염 |
| 🌲 월간 숲 렌더 p95 | **2,000 ms** | AC-1.3이 60초 과업 — 3% 상한 |
| ⭐ 지급 반영 p95 | **800 ms** | 동일 세션 내 반영이 전제 |
| 오프라인 재연결 반영 | **60 s** | ACE-2.1 확정치 |

## 완료 정의

태스크 하나를 끝냈다고 말하려면 아래를 전부 만족해야 한다.

- [ ] `docs/tasks/<TASK-ID>.md` 의 **Acceptance Criteria 전건** — **실패 흐름 포함**
- [ ] 단위·통합 테스트 통과
- [ ] **`prebuild` 게이트 5종 통과** — 모듈 경계 · raw 쿼리 · UI 의존성 · 금지 심볼 · 금지 필드
- [ ] Vercel 프리뷰 배포 성공
- [ ] 계측 이벤트 적재 (해당 시) — **상태 변경과 같은 트랜잭션**
- [ ] 선행 태스크가 전부 끝났는가 (`Depends on` 확인)

## 문서 지도

| 알고 싶은 것 | 문서 |
| --- | --- |
| 무엇을 만드는가 | `docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md` (기술 중립판) |
| 이 스택으로 어떻게 | `docs/tech-design-docs/[SRS]FinFriends-SRS-Tech-v1_0.md` (반영판) |
| 어떤 부품으로 | `docs/tech-design-docs/[Diagrams]FinFriends-Diagrams.md` (설계 32도) |
| 무엇부터 | `docs/plan-docs/[TaskList]FinFriends-Task-List.md` (67건) |
| 이 태스크는 | `docs/tasks/<TASK-ID>.md` |
| 왜 그렇게 정했나 | 중립판 §11 ADR-001~008 · 반영판 §9 ADR-T01~T10 |
| 무엇이 안 정해졌나 | 반영판 §1.5.1 **미해소 D-01 · D-02 · D-03** |
