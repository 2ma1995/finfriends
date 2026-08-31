# [운영] GitHub Project 필드 · 뷰 설정 가이드

**문서 ID:** OPS-FINFRIENDS-PROJECT-001

**개정 버전:** 1.0

**날짜:** 2026-08-26

**대상:** `2ma1995/finfriends-toSRS` · 프로젝트 **#1 FINFRIENDS-GITHUB_PJT**

**근거 문서:** `docs/plan-docs/[Plan]FinFriends-Execution-Plan.md` · `docs/plan-docs/[TaskList]FinFriends-Task-List.md`

> **이 문서가 답하는 것** — 태스크 68건이 프로젝트에 어떤 값으로 들어갔고, 그 값이 **어디서 계산됐는지**. 보드에서 본 숫자의 출처를 되짚을 수 있어야 계획을 신뢰할 수 있다.

---

## 1. 무엇이 들어가 있나

| 항목 | 값 |
| --- | :-: |
| 이슈 | **68건** (`docs/tasks/*.md` 와 1:1) |
| 라벨 | **38종** — `epic:*` 17 · `type:*` 9 · `sprint:S0~S5` · `complexity:*` 3 · `part:*` 2 |
| 프로젝트 항목 | **68건** · 필드 누락 **0** |
| 일정 범위 | **2026-09-01 ~ 2027-01-06** |

---

## 2. 필드 8종과 산출 근거

> **전부 `tools/tasks_data.py` 에서 계산된 값이다.** 사람이 손으로 채운 필드는 없다. 값이 이상하면 보드가 아니라 **데이터와 생성기를 고친다.**

| 필드 | 유형 | 값 | 산출 규칙 |
| --- | --- | --- | --- |
| **Sprint** | 단일선택 | S0~S5 | **DAG 레벨 ÷ 2** — 수기 배치가 아니라 의존성에서 도출. 선행-후행 역전이 구조적으로 불가능하다 |
| **Epic** | 단일선택 | 17종 | 도메인 구분 |
| **Status** | 단일선택 | Ready / Backlog | **선행 태스크가 없으면 `Ready`** = 지금 착수 가능. 그 외는 `Backlog` |
| **Priority** | 단일선택 | P0 / P1 / P2 | **P0 = 임계 경로** · P1 = 후행 5건 이상 · P2 = 나머지 |
| **Size** | 단일선택 | L / M / XS | 복잡도 H → L · M → M · L → XS |
| **Estimate** | 숫자 | 5 / 3 / 1 | 복잡도 환산 person-day |
| **Start date** | 날짜 | — | 자원 제약 일정의 **영업일 offset을 달력 날짜로**(주말 제외 · 기준 `2026-09-01`) |
| **Target date** | 날짜 | — | 동일 |

### 분포

| 필드 | 분포 |
| --- | --- |
| Sprint | S0 **9** · S1 **10** · S2 **12** · S3 **23** · S4 **10** · S5 **3** |
| Status | Ready **2** · Backlog **65** |
| Priority | **P0 12** · P1 3 · P2 52 |
| Size | L 24 · M 39 · XS 4 |
| Estimate 합계 | **241 person-day** |

> **Ready가 2건뿐인 것이 정상이다** — 선행이 없는 태스크는 `INF-001`(임계 경로 시작점)과 `UX-001`(디자인 선행) 둘뿐이다. 나머지 65건은 무언가를 기다린다.

---

## 3. 뷰 5종

프로젝트를 **Team planning 템플릿**으로 만들면 아래 뷰가 딸려온다. 필터는 `My items` 하나에만 걸려 있다.

| # | 뷰 | 형태 | 필터 | 쓰임 |
| :-: | --- | --- | --- | --- |
| 1 | **Backlog** | 보드 | 없음 | **Status로 그룹** → `Ready` 열이 착수 지점 |
| 2 | **Priority board** | 보드 | 없음 | **Priority로 그룹** → `P0` 열이 임계 경로 12건 |
| 3 | **Team items** | 표 | 없음 | 전체 67건. **Sprint로 그룹**하면 스프린트 보드가 된다 |
| 4 | **Roadmap** | 로드맵 | 없음 | Start/Target date로 자동 배치 |
| 5 | **My items** | 표 | `assignee:@me` | 내게 배정된 것만 |

### ⚠️ My items가 비어 보이는 이유

**담당자가 0/67건**이기 때문이다. 배정 전에는 `assignee:@me` 필터에 아무것도 걸리지 않는다. 뷰가 고장 난 것이 아니다.

### 권장 설정

| 보고 싶은 것 | 뷰 | 그룹 기준 |
| --- | --- | --- |
| 지금 뭐부터 하나 | Backlog | **Status** |
| 뭐가 밀리면 큰일인가 | Priority board | **Priority** |
| 스프린트 진행 | Team items | **Sprint** |
| 일정 전체 | Roadmap | Start/Target date · **Sprint로 마커 색 구분** |

---

## 4. 임계 경로 12건 — P0

이 사슬이 밀리면 완료일이 그대로 밀린다.

```
INF-001 → INF-003 → DAT-001 → CTR-001 → CTR-002 → STR-001
        → PRC-005 → GRW-001 → GRW-002 → GRW-003 → REL-002 → TST-005
```

| 태스크 | 기간 | 스프린트 |
| :-: | --- | :-: |
| INF-001 Next.js 앱 · Vercel 연결 | 2026-09-01 ~ 09-04 | S0 |
| INF-003 Supabase · Prisma 연결 | 09-04 ~ 09-09 | S0 |
| DAT-001 Prisma 스키마 2분할 | 09-09 ~ 09-16 | S1 |
| CTR-001 Server Action 계약 | 09-16 ~ 09-23 | S1 |
| CTR-002 도메인 열거형 계약 | 10-01 ~ 10-06 | S2 |
| STR-001 별 원장 엔진 | 10-16 ~ 10-23 | S2 |
| PRC-005 실천 판정 원장 | 11-02 ~ 11-09 | S3 |
| GRW-001 나무 상태 엔진 | 11-26 ~ 12-03 | S3 |
| GRW-002 정체 판정 | 12-15 ~ 12-18 | S4 |
| GRW-003 성장 나무 화면 | 12-18 ~ 12-23 | S4 |
| REL-002 성능 계측 | 12-23 ~ 12-28 | S5 |
| TST-005 성능·부하 테스트 | 2027-01-01 ~ 01-06 | S5 |

---

## 5. 재현 · 갱신

```bash
python3 tools/gh_import.py labels        # 라벨 38종 생성/갱신
python3 tools/gh_import.py issues        # 이슈 생성 (기존 건은 건너뜀)
python3 tools/gh_import.py relink        # 의존성을 실제 이슈 번호로 치환
python3 tools/gh_import.py project 1     # 프로젝트 투입 + 필드 8종 설정
```

| 파일 | 역할 |
| --- | --- |
| `tools/.issue_map.json` | 태스크 ID ↔ 이슈 번호 매핑. **relink · project 단계가 이 파일을 읽는다** |
| `tools/gh_import.py` | 위 4단계 전부 |

### 필요한 토큰 스코프

`repo` · `project` 둘 다 필요하다. `project` 가 없으면 **투입 단계만** 실패한다.

```bash
gh auth refresh -h github.com -s project    # 대화형 — 실제 터미널에서 실행
```

### 일정 기준일을 바꾸려면

`tools/gh_import.py` 의 `BASE_DATE` 를 고치고 `project` 단계를 다시 돌린다. 영업일 offset은 그대로이고 달력 날짜만 이동한다.

---

## 6. 주의

| # | 내용 |
| :-: | --- |
| 1 | **태스크 리스트·이슈 본문은 생성물이다.** 웹에서 이슈 본문을 고치면 다음 생성 때 덮인다. 고칠 것은 `tools/tasks_data.py` 다 |
| 2 | **Blocks는 역산값이다.** 수기로 적으면 반드시 어긋난다 |
| 3 | 저장소가 **PUBLIC** 이다. PRD · 페르소나 · 원가 · 제휴 조건이 공개된다 |
| 4 | 일정은 **외부 블로커가 열린다는 전제**다 — D1(제휴 조건) · D-03(본인인증) · D3(콘텐츠 원고)가 막히면 어떤 편성으로도 압축되지 않는다 |
