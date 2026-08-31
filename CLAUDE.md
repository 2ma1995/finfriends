# 핀프렌즈 (FinFriends)

Claude Code가 세션 시작 시 자동으로 읽는 파일이다.
**여기는 짧게 유지한다.** 상세는 스킬로 빼서 필요할 때 꺼내 읽게 한다.

---

## 이 저장소의 상태

기획이 끝났고 **구현이 시작되지 않았다.** SRS 2종·설계 문서·태스크 68건·실행 일정이 확정돼 있고,
GitHub Project **#1 FINFRIENDS-GITHUB_PJT** 가 이슈 단위로 돌고 있다.

**없는 기능을 만들지 않는다.** 할 일은 `docs/tasks/<TASK-ID>.md` 에 이미 적혀 있다.

## 무엇을 만드는가

아동이 배운 금융 지식을 **실제 돈 행동으로 잇고, 그 변화를 보호자가 읽게** 한다.
핵심 규칙은 **실천 없이는 나무가 자라지 않는다** — 학습·퀴즈를 아무리 채워도 실천이 0이면 승급하지 않는다.
상세는 `.agents/rules/001-project-overview.md`.

## 기술 스택 — 확정 사항

발주 측이 제약(C-TEC-001~007)으로 못박았다. **대안을 제안하기 전에 반영판 SRS §8 충돌 대장을 읽는다.**

- **Next.js App Router 단일 풀스택** — 프론트/백엔드를 분리하지 않는다
- **서버 로직은 Server Action · Route Handler · RSC 셋뿐** — 진입점 19개가 §6.1에 확정
- **Prisma + Supabase PostgreSQL** — 런타임은 풀러, 마이그레이션은 직결(`DIRECT_URL`)
- **Tailwind + shadcn/ui**
- **Vercel 단일 배포** — Git Push가 곧 배포. 외부 CI 없음. 게이트는 `prebuild` 5종

🔴 **AI는 쓰지 않는다.** 요구사항 35건 중 AI 호출을 요구하는 항목이 **0건**이다.
C-TEC-005·006은 유보 등록(REQ-TEC-015)일 뿐이다. 스킬 `303-no-ai-by-default` 참조.

🔴 **배치는 `pg_cron`이다.** Vercel Cron은 무료 요금제가 일 1회라 요건 미달이다(ADR-T02).

도입하지 않는 것: 별도 백엔드 · 내부 HTTP 호출 · 캐시 서버 · 메시지 큐 · Vercel Cron · 외부 CI.
전체 표는 `.agents/rules/002-tech-stack.md`.

## 🔴 규제가 성능보다 우선한다

아동 대상 금융 서비스다. **허용 오차 0인 항목이 7가지** 있다 — 동의 게이트 · 좌표/얼굴 필드 부재 ·
별↔저금통 전환 경로 부재 · 결합 조회 · 아동 독립 로그인 · 별 원장 정합성 · 소급 성공률.

의심스러우면 **먼저 스킬 `304-compliance-gates` 를 연다.**

## 작업 순서

1. `docs/plan-docs/[TaskList]FinFriends-Task-List.md` — 태스크와 선행 관계
2. `docs/tasks/<TASK-ID>.md` — AC · DoD · **실패 시나리오**
3. 참조된 SRS 절과 설계 다이어그램
4. **선행이 안 끝났으면 시작하지 않는다**

절차 전체는 스킬 `400-task-execution-workflow`.

---

## 스킬 라우팅

| 상황 | 스킬 |
| --- | --- |
| 제약을 우회하고 싶어질 때 · 라이브러리를 추가하려 할 때 | **`300-tech-constraints-guardrails`** |
| Server Action / Route Handler / RSC 중 무엇을 쓸지 | `301-server-boundary-rules` |
| Prisma 스키마 · 마이그레이션 · RLS · 커넥션 | `302-data-access-rules` |
| AI를 쓰고 싶어질 때 | `303-no-ai-by-default` |
| 규제·보안 항목을 건드릴 때 | **`304-compliance-gates`** |
| 태스크를 구현으로 옮길 때 | `400-task-execution-workflow` |
| **프로토타입 화면을 만들 때** | **`401-prototype-visual-rules`** |
| 빌드·환경 변수가 깨졌을 때 | `101-build-and-env-setup` |
| 오류를 고칠 때 | `100-error-fixing-process` |
| 커밋·PR을 만들 때 | `200-git-commit-push-pr` |
| 주석을 쓸 때 | `201-code-commenting` |
| 이슈를 다룰 때 | `202-github-issue-handling` |

## 서브에이전트

| 에이전트 | 언제 |
| --- | --- |
| `nextjs-server` | Server Action · Route Handler · RSC 구현 |
| `prisma-data` | 스키마 · 마이그레이션 · RLS · 쿼리 |
| `ui-shadcn` | 화면 구현 · 디자인 토큰 |
| `compliance-gate` | 규제 항목 검증 · 게이트 스크립트 |

## 하지 말 것

- **문서를 손으로 고치지 않는다** — 태스크 리스트·이슈 명세·실행 계획은 **생성물**이다.
  고칠 것은 `tools/tasks_data.py` 이고, 고친 뒤 `python3 tools/gen_task_list.py` 를 돌린다
- **`후행 태스크(Blocks)` 를 수기로 적지 않는다** — 선행에서 역산된다
- **미해소 3건(D-01 · D-02 · D-03)을 임의로 결정하지 않는다** — 사람에게 묻는다
