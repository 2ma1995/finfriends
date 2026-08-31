# [태스크 리스트] 핀프렌즈

**문서 ID:** TASK-FINFRIENDS-MVP-001

**개정 버전:** 1.0

**날짜:** 2026-08-26

**근거 문서:** SRS-FINFRIENDS-TEC-001 (`[SRS]FinFriends-SRS-Tech-v1_0.md`)

**참조 문서:** SRS-FINFRIENDS-MVP-001 (기술 중립판) · 핀프렌즈 PRD v1.0 · 기능정의 v13

> ⚙️ **이 문서는 생성물이다.** 단일 원천은 `tools/tasks_data.py` 이며 `python3 tools/gen_task_list.py` 로 재생성한다. **직접 편집하지 말 것** — `후행 태스크(Blocks)` 는 `선행 태스크` 에서 자동 역산되므로 수기 편집은 반드시 불일치를 만든다.

---

## 0. 이 문서를 읽는 법

### 0.1 근거와 범위

본 태스크 리스트는 **기술제약 반영판 SRS**를 기준으로 작성했다. 중립판이 아니라 반영판을 택한 이유는, 반영판만이 구현 단위(Server Action · Route Handler · RSC · Cron)를 확정하고 있어 **실행 가능한 태스크로 분해할 수 있기 때문**이다.

- SRS에 **명시되지 않은 기능은 추가하지 않았다.** 모든 태스크는 `관련 SRS 참조` 열로 원문을 지목한다.
- 요구사항 ID는 두 SRS가 공유하므로 `REQ-FUNC-008` 같은 참조는 양쪽에서 동일하게 성립한다.
- Won't Have(REQ-FUNC-017 기록 이전)는 **태스크로 만들지 않았다.** 제외 내역은 부록 B에 있다.

> **참조 표기 규칙** — `관련 SRS 참조` 열의 `§` 는 **기술제약 반영판**의 절이다. 기술 중립판을 가리킬 때만 `중립판 §9.1` 처럼 명시한다.

### 0.2 관점 분리

| Part | 관점 | ID 접두어 | 산출물 성격 |
| --- | --- | --- | --- |
| **Part A** | 백엔드 · 프론트엔드 개발 및 인프라 구성 | `INF` `TEC` `CTR` `DAT` `MCK` `CON` `LRN` `STR` `PRC` `GRW` `PLN` `NTF` `PTN` `ANA` `SEC` `REL` `TST` | 동작하는 코드 · 구성 |
| **Part B** | UI/UX 디자인 | `UX` | 화면 정의 · 디자인 산출물 |

Part A 안에서도 **UX 구현(유형 `UI`)과 기능 구현(BE)을 분리**한다. 담당자와 리뷰 관점이 다르고, UX 구현 진척을 독립적으로 추적해야 하기 때문이다.

### 0.3 유형(Type) 분류

| 유형 | 의미 | 방법론 단계 | 건수 |
| --- | --- | :-: | :-: |
| `Contract` | DTO · 스키마 · 열거형 등 공유 계약 | Step 1 | 2 |
| `Data` | DB 스키마 · 시드 · 사전 데이터 | Step 1 | 5 |
| `Read` | 조회 경로 (상태 변경 없음) | Step 2 | 2 |
| `UI` | **프론트엔드 화면 구현** — 기능 구현(BE)과 분리 | Step 2 | 6 |
| `Write` | 상태 변경 · Server Action · Cron · 웹훅 | Step 2 | 29 |
| `Test` | AC를 실행 가능한 테스트로 변환 | Step 3 | 5 |
| `Infra` | 프레임워크 · 배포 · 게이트 · 외부 연동 배선 | Step 4 | 5 |
| `NFR` | 보안 · 관측 · 비용 · 복구 | Step 4 | 8 |
| `Design` | 디자인 토큰 · 화면 정의 | — | 6 |
| | | **합계** | **68** |

> **Epic과 유형은 서로 다른 축이다.** Epic은 *어느 도메인인가*, 유형은 *어떤 성격의 작업인가* 를 뜻하므로 `INF-002`(Platform & Infra / `UI`)처럼 둘이 어긋나 보이는 조합이 정상이다.

### 0.4 Epic 목록

| Epic | 도메인 | 태스크 수 |
| --- | --- | :-: |
| `INF` | Platform & Infra | 4 |
| `TEC` | Constraint Gate | 2 |
| `CTR` | Contract | 2 |
| `DAT` | Data & Schema | 4 |
| `MCK` | Mock & Fixture | 1 |
| `CON` | Consent & Account | 5 |
| `LRN` | Learning | 3 |
| `STR` | Star Ledger | 5 |
| `PRC` | Practice | 5 |
| `GRW` | Growth | 5 |
| `PLN` | Plan & Spending | 6 |
| `NTF` | Notification | 3 |
| `PTN` | Partner Gateway | 3 |
| `ANA` | Analytics | 4 |
| `SEC` | Security & Privacy | 2 |
| `REL` | Reliability & Ops | 3 |
| `TST` | Test | 5 |
| `UX` | UI/UX Design | 6 |
| | **합계** | **68** |

### 0.5 복잡도 판정 기준

| 등급 | 기준 | 예 |
| :-: | --- | --- |
| **H** | 외부 시스템 연동 · 새 개념 도입 · 되돌림 비용이 크거나 SRS가 임계치를 건 항목 | 별 원장 멱등 · 결제 매칭 · RLS 정책 |
| **M** | 기존 패턴의 조합. 설계는 정해져 있고 구현량이 있음 | Server Action 작성 · Cron 엔드포인트 |
| **L** | 설정 · 선언 수준. 판단이 거의 필요 없음 | 정적 검사 편입 · 잔여율 배치 |

분포: **H 24 · M 40 · L 4**

### 0.6 스프린트 배치

스프린트는 **DAG 레벨에서 자동 도출**한다(레벨 2개당 1스프린트). 수기 배치가 아니므로 선행-후행 역전이 생기지 않는다.

| 스프린트 | 태스크 수 | DAG 레벨 |
| :-: | :-: | :-: |
| **S0** | 9 | 0~1 |
| **S1** | 11 | 2~3 |
| **S2** | 12 | 4~5 |
| **S3** | 23 | 6~7 |
| **S4** | 10 | 8~9 |
| **S5** | 3 | 10~11 |

---

## Part A. 백엔드 · 프론트엔드 개발 및 인프라 구성

### `INF` — Platform & Infra (4건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="INF-001"></a>**INF-001** | Platform & Infra | Next.js App Router 앱 생성 · Vercel 연결 · 환경 변수 배선 | `Infra` | §1.5 C-TEC-{001, 007} · §4.3 REQ-TEC-{001, 013, 014} · §6.4 환경 변수 · §3.3 모듈 구조 | None | INF-002 · INF-003 · INF-004 · REL-002 · TEC-001 · TEC-002 | M | S0 |
| <a id="INF-002"></a>**INF-002** | Platform & Infra | Tailwind CSS + shadcn/ui 설정 및 공통 레이아웃 | `UI` | §1.5 C-TEC-004 · §4.3 REQ-TEC-007 · 중립판 §3 클라이언트 | INF-001 · UX-001 | GRW-003 · INF-004 · MCK-001 · PLN-004 · STR-003 | M | S0 |
| <a id="INF-003"></a>**INF-003** | Platform & Infra | Supabase · Prisma 연결 및 커넥션 경로 분리 | `Infra` | §1.5 C-TEC-003 · §4.3 REQ-TEC-{004, 005} · §6.4 · ADR-T04 | INF-001 | DAT-001 · PTN-001 · REL-003 · TEC-001 · TEC-002 | M | S0 |
| <a id="INF-004"></a>**INF-004** | Platform & Infra | PWA 구성 — Service Worker · 설치 유도 | `Infra` | §4.2 REQ-NF-003 조정 · §8 X1 · X3 · ADR-T06 · ADR-T07 | INF-001 · INF-002 | ANA-003 · NTF-001 | M | S1 |

### `TEC` — Constraint Gate (2건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="TEC-001"></a>**TEC-001** | Constraint Gate | 제약 게이트 5종 구축 — prebuild 검사와 빌드 차단 | `Infra` | §4.3 REQ-TEC-{002, 004, 007, 008, 009, 014} · §10 검증 게이트 · ADR-T01 · ADR-T08 | INF-001 · INF-003 | STR-004 | H | S1 |
| <a id="TEC-002"></a>**TEC-002** | Constraint Gate | Cron 진입점 골격과 시크릿 인증 | `Infra` | §4.3 REQ-TEC-010 · §6.3 배치 규약 · ADR-T02 | INF-001 · INF-003 | ANA-002 · DAT-002 · NTF-002 · PLN-006 · SEC-001 · STR-002 | M | S1 |

### `CTR` — Contract (2건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="CTR-001"></a>**CTR-001** | Contract | Server Action 입출력 계약 · ActionResult · 인가 가드 시그니처 | `Contract` | §6.1 서버 진입점 목록 · §6.6 접근 제어 · §4.3 REQ-TEC-003 | DAT-001 | CON-001 · CTR-002 · PTN-001 | H | S1 |
| <a id="CTR-002"></a>**CTR-002** | Contract | 도메인 열거형 계약 6종 — 트리거 · 판정 · 상태 · 채널 | `Contract` | 중립판 §6.2.1~6.2.7 · §4.3 REQ-TEC-002 | CTR-001 | ANA-001 · LRN-001 · LRN-003 · PLN-001 · PRC-001 · PRC-005 · STR-001 · TST-001 | M | S2 |

### `DAT` — Data & Schema (4건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="DAT-001"></a>**DAT-001** | Data & Schema | Prisma 스키마 2분할 (identity / activity) 및 RLS 기반 | `Data` | §6.2 데이터 모델 · §4.3 REQ-TEC-006 · 중립판 §6.4 · ADR-T03 | INF-003 | CON-001 · CTR-001 · DAT-002 · DAT-003 · DAT-004 · PTN-002 · SEC-001 · SEC-002 · STR-001 | H | S1 |
| <a id="DAT-002"></a>**DAT-002** | Data & Schema | app_events 주차 파티셔닝과 회전 배치 | `Data` | §6.2 · §4.3 REQ-TEC-{004, 012} · §8 Y3 | DAT-001 · TEC-002 | ANA-001 | M | S1 |
| <a id="DAT-003"></a>**DAT-003** | Data & Schema | 학습 콘텐츠 4영역 시드 · 회고 문장 풀 적재 | `Data` | 중립판 REQ-FUNC-003 · ACE-5.1 · §6.3 배치 | DAT-001 | LRN-001 · PLN-003 | M | S1 |
| <a id="DAT-004"></a>**DAT-004** | Data & Schema | 업종 분류 사전과 가맹점 매칭 기준 데이터 | `Data` | 중립판 REQ-FUNC-008 · AC-4.2 · §8 D-03 인접 | DAT-001 | PLN-001 · PTN-003 | M | S1 |

### `MCK` — Mock & Fixture (1건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="MCK-001"></a>**MCK-001** | Mock & Fixture | 화면용 목 픽스처 — 정상 · 경계 · 빈 상태 | `Data` | 중립판 §6.2 데이터 모델 · §6.4 스키마 · 제안 prototype-suggestion.md | INF-002 | GRW-003 · GRW-005 · PLN-004 · STR-003 | M | S1 |

### `CON` — Consent & Account (5건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="CON-001"></a>**CON-001** | Consent & Account | Supabase Auth 보호자 계정과 아동 종속 프로필 | `Write` | 중립판 REQ-NF-011 · S5 · §6.6 접근 제어 | DAT-001 · CTR-001 | CON-002 · NTF-001 | M | S2 |
| <a id="CON-002"></a>**CON-002** | Consent & Account | 법정대리인 동의 게이트 — 서버 판정과 차단 계측 | `Write` | 중립판 REQ-NF-008 · S6 · ACE-8.2 · §6.6 | CON-001 | CON-003 · CON-004 · TST-003 | H | S2 |
| <a id="CON-003"></a>**CON-003** | Consent & Account | 보호자 온보딩 5단계 — 세션 분할 저장과 입력값 보존 | `Write` | 중립판 REQ-FUNC-007 · AC-8.1 · AC-8.3 · ACE-8.1 | CON-002 · PTN-001 | CON-005 | M | S3 |
| <a id="CON-004"></a>**CON-004** | Consent & Account | 아동 온보딩 — 5분 내 첫 보상 루프 | `Write` | 중립판 REQ-FUNC-006 · AC-9.1 | CON-002 · LRN-001 · STR-001 | None | M | S3 |
| <a id="CON-005"></a>**CON-005** | Consent & Account | 카드 없이 학습부터 시작하는 체험 경로 | `Write` | 중립판 REQ-FUNC-015 · AC-8.2 | CON-003 · LRN-001 | None | M | S3 |

### `LRN` — Learning (3건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="LRN-001"></a>**LRN-001** | Learning | 커리큘럼 4영역 · 퀴즈 · 해설 · 이수 판정 | `Write` | 중립판 REQ-FUNC-003 · AC-2.4 · 6.2.1 | DAT-003 · CTR-002 | CON-004 · CON-005 · GRW-001 · LRN-002 · LRN-003 | M | S2 |
| <a id="LRN-002"></a>**LRN-002** | Learning | 출석체크 — 벌칙·감소 연출 없는 스트립 | `Write` | 중립판 REQ-FUNC-003 (P-23) · §10.2 D5 | LRN-001 · STR-001 | None | L | S3 |
| <a id="LRN-003"></a>**LRN-003** | Learning | 예적금 비교·선택 화면 — 중개 회피 경계 | `Write` | 중립판 REQ-FUNC-014 · REQ-NF-012 · §10.2 D2 | LRN-001 · CTR-002 | None | M | S3 |

### `STR` — Star Ledger (5건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="STR-001"></a>**STR-001** | Star Ledger | 별 원장 엔진 — 트리거 8종 · 이중 기입 · 멱등 | `Write` | 중립판 REQ-FUNC-004 · REQ-NF-006 · ACE-2.2 · §4.3 REQ-TEC-011 · ADR-003 | CTR-002 · DAT-001 | CON-004 · LRN-002 · PLN-003 · PRC-001 · PRC-004 · PRC-005 · STR-002 · STR-003 · STR-004 · STR-005 · TST-002 | H | S2 |
| <a id="STR-002"></a>**STR-002** | Star Ledger | 별 원장 일일 정산 배치와 불일치 알림 | `NFR` | 중립판 REQ-NF-006 · §6.3 배치 · REL-001 | STR-001 · TEC-002 | None | M | S3 |
| <a id="STR-003"></a>**STR-003** | Star Ledger | 아바타 · 옷장 — Lottie 2.5D 렌더와 차감 연동 | `UI` | §4.2 REQ-FUNC-005 조정 · §8 X2 · ADR-T05 · 중립판 P-13 | STR-001 · UX-003 · INF-002 · MCK-001 | None | H | S3 |
| <a id="STR-004"></a>**STR-004** | Star Ledger | 별↔저금통 분리 정적 검사 편입 | `NFR` | 중립판 REQ-NF-010 · S4 · §4.3 REQ-TEC-008 · ADR-003 | TEC-001 · STR-001 | STR-005 | L | S3 |
| <a id="STR-005"></a>**STR-005** | Star Ledger | 별의 옷장 외 목적지 (분리선 재검토 선행) | `Write` | 중립판 REQ-FUNC-016 · REQ-NF-010 · P-21 | STR-001 · STR-004 | None | M | S3 |

### `PRC` — Practice (5건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="PRC-001"></a>**PRC-001** | Practice | 미션 루프 — 조건·금액 사전 설정 · 승인 · 거절 | `Write` | 중립판 REQ-FUNC-002 · AC-6.3 · ACE-6.1 · §6.2.4 | CTR-002 · STR-001 | PRC-002 | M | S3 |
| <a id="PRC-002"></a>**PRC-002** | Practice | ⭐ 소급 지급과 주기 귀속 | `Write` | 중립판 REQ-FUNC-010 · REQ-NF-007 · AC-6.1 · ACE-6.2 | PRC-001 · GRW-001 | PRC-003 · TST-002 | H | S4 |
| <a id="PRC-003"></a>**PRC-003** | Practice | 승인 대기 5건 이상 일괄 승인 | `Write` | 중립판 ACE-6.3 | PRC-002 | None | M | S4 |
| <a id="PRC-004"></a>**PRC-004** | Practice | 위시리스트 — 30·70·100% 단계 보상과 월 1회 순위 변경 | `Write` | 중립판 REQ-FUNC-012 · AC-9.2 | STR-001 | None | M | S3 |
| <a id="PRC-005"></a>**PRC-005** | Practice | 실천 판정 원장과 practice_credited 적재 | `Write` | 중립판 §9.1 WPA · REQ-FUNC-004 · AC-2.1 · §4.3 REQ-TEC-012 | STR-001 · CTR-002 | ANA-002 · GRW-001 | H | S3 |

### `GRW` — Growth (5건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="GRW-001"></a>**GRW-001** | Growth | 나무 상태 엔진 — 승급 조건 논리곱과 영역별 주기 | `Write` | 중립판 REQ-FUNC-001 · AC-2.2 · ACE-2.3 · §6.2.1 · §6.2.3 · ADR-006 | LRN-001 · PRC-005 | GRW-002 · GRW-004 · PRC-002 | H | S3 |
| <a id="GRW-002"></a>**GRW-002** | Growth | 정체 판정 14일과 원인 조건 단위 표시 | `Write` | 중립판 AC-3.1 · ACE-3.1 · ACE-3.2 · REQ-FUNC-001 | GRW-001 | GRW-003 | M | S4 |
| <a id="GRW-003"></a>**GRW-003** | Growth | 성장 나무 화면 (RSC) — 4영역 · 실천 근거 · 대기 N건 | `UI` | 중립판 REQ-FUNC-001 · AC-1.1 · AC-1.2 · ACE-1.1 · REQ-NF-001 | GRW-002 · UX-002 · INF-002 · MCK-001 | REL-002 · TST-004 | M | S4 |
| <a id="GRW-004"></a>**GRW-004** | Growth | 월간 숲 스냅샷과 전월 대비 델타 7항목 | `Write` | 중립판 REQ-FUNC-009 · AC-1.3 · ACE-1.2 | GRW-001 · PLN-003 | GRW-005 | H | S4 |
| <a id="GRW-005"></a>**GRW-005** | Growth | 월간 숲 화면 (RSC) — 한 줄 요약과 획득 별 노출 | `UI` | 중립판 AC-1.3 · AC-1.4 · REQ-NF-001 | GRW-004 · UX-002 · MCK-001 | None | M | S4 |

### `PLN` — Plan & Spending (6건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="PLN-001"></a>**PLN-001** | Plan & Spending | 소비 계획 카드 CRUD — 어디서 · 업종 · 금액 · 작성 주체 | `Write` | 중립판 REQ-FUNC-008 · AC-4.1 · AC-4.4 · ADR-002 | CTR-002 · DAT-004 | PLN-002 | M | S2 |
| <a id="PLN-002"></a>**PLN-002** | Plan & Spending | 계획↔실제 결제 매칭 — 정확도 90% · 합계 판정 | `Write` | 중립판 AC-4.2 · ACE-4.1 · ADR-008 · §8 D-01 인접 | PLN-001 · PTN-002 | PLN-003 · PLN-005 | H | S3 |
| <a id="PLN-003"></a>**PLN-003** | Plan & Spending | 두 갈래 회고 — 지킴 ⭐1 / 넘김 회고만 · 문장 비복원 추출 | `Write` | 중립판 AC-5.1~5.6 · ACE-5.1 · ACE-5.2 · §6.2.5 | PLN-002 · DAT-003 · STR-001 | GRW-004 · PLN-004 · PLN-006 | H | S3 |
| <a id="PLN-004"></a>**PLN-004** | Plan & Spending | 계획 카드 · 대조 · 회고 화면 | `UI` | 중립판 AC-5.6 · AC-4.3 · REQ-NF-014 | PLN-003 · UX-004 · INF-002 · MCK-001 | TST-004 | M | S4 |
| <a id="PLN-005"></a>**PLN-005** | Plan & Spending | 소비 내역 — 전월 대비 증감액 상단 · 업종별 집계 | `Read` | 중립판 REQ-FUNC-013 · §8.3 범위 밖 사용자 | PLN-002 | None | M | S3 |
| <a id="PLN-006"></a>**PLN-006** | Plan & Spending | 회고 문장 풀 잔여율 감시 배치 | `NFR` | 중립판 ACE-5.1 · §6.3 배치 | PLN-003 · TEC-002 | None | L | S4 |

### `NTF` — Notification (3건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="NTF-001"></a>**NTF-001** | Notification | Web Push 구독 관리와 발송 시간대 설정 | `Write` | §4.2 REQ-FUNC-011 조정 · §6.5 · ADR-T07 · 중립판 AC-7.3 | INF-004 · CON-001 | NTF-002 | M | S2 |
| <a id="NTF-002"></a>**NTF-002** | Notification | 72시간 미접속 판정 배치 — 4시간 주기 · 오탐 0건 | `Write` | 중립판 REQ-FUNC-011 · AC-7.1 · AC-7.2 · ACE-7.3 · §6.3 | NTF-001 · TEC-002 | NTF-003 | H | S3 |
| <a id="NTF-003"></a>**NTF-003** | Notification | 채널 폴백 — 앱 내 배너 큐와 앱 삭제 분기 | `Write` | 중립판 ACE-7.1 · ACE-7.2 · §6.5 · §1.5.1 D-01 | NTF-002 | TST-004 | M | S3 |

### `PTN` — Partner Gateway (3건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="PTN-001"></a>**PTN-001** | Partner Gateway | 제휴사 어댑터 — 카드 발급 · 충전 · 해지 | `Write` | 중립판 REQ-NF-013 · REQ-NF-015 · §3.2 · §6.1 · ADR-004 | CTR-001 · INF-003 | CON-003 · PTN-002 · PTN-003 | H | S2 |
| <a id="PTN-002"></a>**PTN-002** | Partner Gateway | 결제 웹훅 수신 — 서명 검증과 멱등 처리 | `Write` | §6.1 · §4.3 REQ-TEC-011 · 중립판 REQ-FUNC-008 · §8 Y5 | PTN-001 · DAT-001 | PLN-002 | H | S2 |
| <a id="PTN-003"></a>**PTN-003** | Partner Gateway | 결제 내역 동기화와 업종 코드 수집 | `Read` | 중립판 §6.1 결제 내역 조회 · REQ-FUNC-013 · §8 X6 인접 | PTN-001 · DAT-004 | None | M | S2 |

### `ANA` — Analytics (4건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="ANA-001"></a>**ANA-001** | Analytics | 인앱 이벤트 10종 적재 규약 구현 | `Write` | 중립판 §6.1 이벤트 명세 · §4.3 REQ-TEC-012 | DAT-002 · CTR-002 | ANA-002 · ANA-003 · REL-001 · REL-003 | H | S2 |
| <a id="ANA-002"></a>**ANA-002** | Analytics | WPA 주간 배치 — 분자·분모 조작적 정의 구현 | `Write` | 중립판 §9.1 WPA · §6.3 배치 · ADR-001 | ANA-001 · PRC-005 · TEC-002 | ANA-004 | H | S3 |
| <a id="ANA-003"></a>**ANA-003** | Analytics | 오프라인 이벤트 큐 — IndexedDB 적재와 재연결 반영 | `Write` | §4.2 REQ-NF-003 조정 · 중립판 ACE-2.1 · §8 X3 · ADR-T06 | INF-004 · ANA-001 | None | H | S3 |
| <a id="ANA-004"></a>**ANA-004** | Analytics | 운영 지표 화면 — 북극성 · 보조 KPI · 판정 구간 | `UI` | 중립판 §9.1 · §9.4 · REQ-NF-017 | ANA-002 · UX-005 | None | M | S4 |

### `SEC` — Security & Privacy (2건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="SEC-001"></a>**SEC-001** | Security & Privacy | 규제·보안 스캔 배치 — S1 · S2 · S3 · S5 | `NFR` | 중립판 §4.3 S1~S6 · §4.3 REQ-TEC-{006, 009} · §6.3 | DAT-001 · TEC-002 | REL-001 | M | S1 |
| <a id="SEC-002"></a>**SEC-002** | Security & Privacy | RLS 정책과 결합 조회 차단 검증 | `NFR` | 중립판 REQ-NF-009 · §4.3 REQ-TEC-006 · ADR-T03 | DAT-001 | TST-003 | H | S1 |

### `REL` — Reliability & Ops (3건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="REL-001"></a>**REL-001** | Reliability & Ops | 알림 라우팅 · 대응 SLA · 에스컬레이션 | `NFR` | 중립판 REQ-NF-017 · §1.5.1 D-02 · §8 X5 | ANA-001 · SEC-001 | None | M | S3 |
| <a id="REL-002"></a>**REL-002** | Reliability & Ops | 성능 계측 — 화면 p95와 콜드 스타트 발생률 | `NFR` | 중립판 REQ-NF-001 · 002 · 005 · §8 Y7 · 중립판 §7.4 | INF-001 · GRW-003 | TST-005 | M | S5 |
| <a id="REL-003"></a>**REL-003** | Reliability & Ops | 원가 집계 — C_child · 클라우드 · 본인인증 호출 | `NFR` | 중립판 REQ-NF-016 · §4.3 B1~B5 | INF-003 · ANA-001 | None | L | S3 |

### `TST` — Test (5건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="TST-001"></a>**TST-001** | Test | 계약 스냅샷 · 열거형 회귀 테스트 | `Test` | §4.3 REQ-TEC-002 · 중립판 §6.2 | CTR-002 | None | M | S2 |
| <a id="TST-002"></a>**TST-002** | Test | 별 정합성 · 멱등 · 소급 지급 테스트 | `Test` | 중립판 REQ-NF-006 · 007 · ACE-2.1 · ACE-2.2 · ACE-6.2 | STR-001 · PRC-002 | None | H | S4 |
| <a id="TST-003"></a>**TST-003** | Test | 규제 상수 자동 테스트 100% | `Test` | 중립판 §9.5 α 게이트 · REQ-NF-008~015 | CON-002 · SEC-002 | None | H | S3 |
| <a id="TST-004"></a>**TST-004** | Test | 수용 기준 51건 시나리오 테스트 매핑 | `Test` | 중립판 §9.2 정상 32건 · §9.3 예외 19건 | GRW-003 · PLN-004 · NTF-003 | None | H | S5 |
| <a id="TST-005"></a>**TST-005** | Test | 성능·부하 테스트와 게이트 판정 | `Test` | 중립판 REQ-NF-001 · 002 · 004 · 005 · §10 검증 게이트 | REL-002 | None | M | S5 |

## Part B. UI/UX 디자인

### `UX` — UI/UX Design (6건)

| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | 선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |
|---|---|---|---|---|---|---|---|---|
| <a id="UX-001"></a>**UX-001** | UI/UX Design | 디자인 토큰과 컴포넌트 기준 정의 | `Design` | 중립판 REQ-NF-014 · §1.5 C-TEC-004 | None | INF-002 · UX-002 · UX-003 · UX-004 · UX-005 · UX-006 | M | S0 |
| <a id="UX-002"></a>**UX-002** | UI/UX Design | 보호자 화면 정의 — 성장 나무 · 월간 숲 | `Design` | 중립판 AC-1.1~1.4 · AC-3.1 · ACE-1.1 · ACE-1.2 | UX-001 | GRW-003 · GRW-005 | H | S0 |
| <a id="UX-003"></a>**UX-003** | UI/UX Design | 아동 홈 — 아바타 · 옷장 · 별 잔액 | `Design` | §4.2 REQ-FUNC-005 조정 · 중립판 §8.2 · ADR-T05 | UX-001 | STR-003 | M | S0 |
| <a id="UX-004"></a>**UX-004** | UI/UX Design | 계획 카드 · 대조 · 두 갈래 회고 화면 정의 | `Design` | 중립판 AC-4.1 · AC-5.6 · ACE-4.2 · §6.2.5 | UX-001 | PLN-004 | H | S0 |
| <a id="UX-005"></a>**UX-005** | UI/UX Design | 온보딩 · 동의 · 운영 화면 정의 | `Design` | 중립판 AC-8.1~8.3 · REQ-NF-008 · REQ-NF-014 | UX-001 | ANA-004 | M | S0 |
| <a id="UX-006"></a>**UX-006** | UI/UX Design | 빈 상태 · 잠금 · 오류 문구 체계 | `Design` | 중립판 ACE-1.1 · ACE-1.2 · AC-2.4 · REQ-NF-014 | UX-001 | None | M | S0 |

---

## 부록 A. 검증 결과

| 항목 | 결과 |
| --- | :-: |
| 고유 ID | 68 / 68 (중복 0) |
| 미정의 선행 태스크 | 0 |
| 순환 의존성 | 0 |
| SRS 참조 미기재 | 0 |
| 수용 기준 미기재 | 0 |
| 스프린트 배치 | 68 / 68 (누락 0) |
| 선행-후행 역전 | 0 (레벨 자동 도출) |

### 요구사항 커버리지

| 요구사항군 | 건수 | 담당 태스크 보유 |
| --- | :-: | :-: |
| REQ-FUNC-001 ~ 016 (Won't 제외) | 16 | 전건 |
| REQ-NF-001 ~ 018 | 18 | 전건 |
| REQ-TEC-001 ~ 015 | 15 | 전건 |

## 부록 B. 의도적으로 제외한 항목

| 항목 | 근거 |
| --- | --- |
| **REQ-FUNC-017** 기존 앱 기록 이전 | Won't Have 확정 (중립판 §4.1). 본 릴리즈에서 구현하지 않는다 |
| **문자 대체 발송** (ACE-7.1) | **D-01 미해소** — 외부 발송 사업자 승인 전까지 태스크로 만들지 않는다 (§1.5.1) |
| **AI 호출 기능** | 요구사항 35건 중 AI를 요구하는 항목이 **0건**이다 (반영판 §8 C · REQ-TEC-015 유보) |
| **자동 사전 개입** (위치 알림 · 트리거) | **폐기된 기능**이며 로드맵에 없다 (ADR-002) |

## 부록 C. 미해소 결정에 걸린 태스크

| 미해소 | 걸린 태스크 | 닫히지 않으면 |
| :-: | --- | --- |
| **D-01** 문자 채널 | NTF-003 | ACE-7.1 문자 경로가 **미구현**으로 남는다 |
| **D-02** 온콜 Webhook | REL-001 · ANA-004 | 즉시 알림이 **앱 내 화면에 의존**한다 |
| **D-03** 본인인증 위임 | CON-003 · PTN-001 | 온보딩 1단계 구현 수단이 바뀐다 |
| **D2** 예적금 법률 검토 | LRN-003 | **착수 불가** (Could Have) |
| **D4** 3D 사양 | STR-003 · UX-003 | 에셋 제작 착수 금지 (B4 게이트) |
| **D5** 출석 조건 | LRN-002 | 기본값으로 운영하고 결정 시 설정 변경 |
| **D6** 나무 단계 수치 | GRW-001 | 설정값으로 주입해 착수는 가능 |

---

*생성: `python3 tools/gen_task_list.py` · 단일 원천: `tools/tasks_data.py`*
