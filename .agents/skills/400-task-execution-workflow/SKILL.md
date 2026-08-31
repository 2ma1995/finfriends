---
name: 400-task-execution-workflow
description: 태스크 67건을 구현으로 옮기는 절차. 작업을 시작하기 전에 읽는다.
---

# 태스크 실행 절차

**할 일은 이미 적혀 있다.** 만들 것을 정하는 것이 아니라, 적힌 것을 순서대로 옮긴다.

---

## 1. 시작 전

```
1. docs/plan-docs/[TaskList]FinFriends-Task-List.md 에서 태스크를 찾는다
2. 「선행 태스크(Dependencies)」가 전부 끝났는지 확인한다
   → 안 끝났으면 시작하지 않는다
3. docs/tasks/<TASK-ID>.md 를 연다
4. 참조된 SRS 절과 설계 다이어그램을 읽는다
```

**Status가 `Ready` 인 태스크만 착수 가능하다.** 현재 `INF-001` 과 `UX-001` 둘뿐이다.

## 2. 태스크 명세 읽는 법

| 절 | 무엇 |
| --- | --- |
| 🎯 Summary | 목적 — **왜 이 태스크가 있는가** |
| 🔗 References | 읽어야 할 문서. **먼저 읽는다** |
| ✅ Task Breakdown | 실행 계획 체크리스트 |
| 🧪 Acceptance Criteria | **Given/When/Then.** 「실패 흐름」 시나리오가 핵심이다 |
| ⚙️ Constraints | 성능·규제·기술 제약 |
| 🏁 DoD | 완료 정의 |
| 🚧 Dependencies | 선행 · 후행 이슈 번호 |

> **실패 흐름을 건너뛰지 않는다.** 정상 경로만 만들면 AC의 절반이 미충족이다.

## 3. 구현 순서

```
계약 → 데이터 → 동작 → 테스트 → 비기능
```

태스크의 `유형` 이 이 단계를 나타낸다. **Contract·Data 태스크가 끝나기 전에 Write를 시작하지 않는다** —
계약이 흔들리면 두 태스크가 같은 것을 다르게 구현한다.

## 4. 구현 중

| 상황 | 행동 |
| --- | --- |
| 진입점을 만들어야 한다 | 스킬 `301-server-boundary-rules` — **§6.1 표에 있는지 먼저 확인** |
| 스키마를 바꿔야 한다 | 스킬 `302-data-access-rules` — RLS를 같은 변경에 |
| 규제 항목을 건드린다 | 스킬 `304-compliance-gates` |
| 라이브러리를 추가하고 싶다 | 스킬 `300-tech-constraints-guardrails` |
| AI를 쓰고 싶다 | 스킬 `303-no-ai-by-default` |
| 요구사항에 없는 게 필요해 보인다 | **만들지 않는다. 사람에게 묻는다** |

## 5. 완료 판정

`docs/tasks/<TASK-ID>.md` 의 DoD를 그대로 쓴다.

- [ ] Acceptance Criteria **전건** — 실패 흐름 포함
- [ ] 단위·통합 테스트 통과
- [ ] **`prebuild` 게이트 5종 통과**
- [ ] Vercel 프리뷰 배포 성공
- [ ] 계측 이벤트 적재 (해당 시) — 상태 변경과 **같은 트랜잭션**
- [ ] 태스크별 추가 DoD 항목

## 6. 막혔을 때

| 막힘 | 처리 |
| --- | --- |
| 선행 태스크 미완 | 기다린다. 우회 구현하지 않는다 |
| **미해소 D-01 · D-02 · D-03** | **임의로 결정하지 않는다.** 해당 경로를 미구현으로 두고 기록한다 |
| 외부 블로커 (D1 제휴 조건 · D2 법률 검토 · D3 원고) | 태스크 명세의 `External Blocker` 확인. 착수 조건이 명시돼 있다 |
| 제약이 요구사항을 깨뜨린다 | 반영판 §8 대장 확인 → 없으면 사람에게 |

## 7. 문서를 고쳐야 할 때

**태스크 리스트 · 이슈 명세 · 실행 계획은 생성물이다.**

```bash
# 고칠 것은 여기다
vi tools/tasks_data.py

# 고친 뒤 전부 다시 만든다
python3 tools/gen_task_list.py
python3 tools/gen_task_docs.py
python3 tools/gen_exec_plan.py
python3 tools/verify_docs.py
python3 tools/verify_links.py
```

**`후행 태스크(Blocks)` 를 수기로 적지 않는다** — 선행에서 역산된다.
GitHub 이슈 본문도 생성물이다. 웹에서 고치면 다음 생성 때 덮인다.
