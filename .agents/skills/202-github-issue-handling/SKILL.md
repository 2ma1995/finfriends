---
name: 202-github-issue-handling
description: GitHub 이슈 · 프로젝트를 다루는 규칙. 이슈 67건은 생성물이다.
---

# 이슈 다루기

## 1. 이슈 67건은 생성물이다

`docs/tasks/<TASK-ID>.md` 와 **1:1로 대응**한다. 단일 원천은 `tools/tasks_data.py` 다.

```
tools/tasks_data.py
      ↓ gen_task_docs.py
docs/tasks/*.md
      ↓ gh_import.py relink
GitHub Issues (본문 갱신)
```

**웹에서 이슈 본문을 고치면 다음 생성 때 덮인다.** 고칠 것은 `tasks_data.py` 다.

## 2. 프로젝트 필드도 계산값이다

**#1 FINFRIENDS-GITHUB_PJT** 의 필드 8종은 전부 도출된 값이다.

| 필드 | 산출 |
| --- | --- |
| Sprint | DAG 레벨 ÷ 2 |
| Status | 선행 없으면 `Ready` |
| Priority | `P0` = **임계 경로** · `P1` = 후행 5건 이상 |
| Size · Estimate | 복잡도 환산 (H 5d · M 3d · L 1d) |
| Start / Target date | 자원 제약 일정의 영업일 → 달력 |

**보드에서 손으로 고치지 않는다.** 값이 이상하면 데이터와 생성기를 고치고 다시 주입한다.

```bash
python3 tools/gh_import.py project 1
```

## 3. 작업을 시작할 때

```
1. Status 가 Ready 인지 확인 — Backlog면 선행이 안 끝났다
2. Depends on 이슈가 전부 닫혔는지 확인
3. 이슈를 자신에게 배정하고 Status 를 In progress 로
```

## 4. 작업을 끝낼 때

- **DoD 체크박스를 전부 채운다** — 특히 실패 흐름 AC
- PR을 이슈에 연결한다
- **Blocks 에 적힌 후행 이슈**를 확인한다 — 기다리는 사람이 있다

## 5. 새 이슈를 만들 때

**태스크 이슈를 손으로 만들지 않는다.** `tasks_data.py` 에 추가하고 생성기를 돌린다.

버그·질문 등 태스크가 아닌 것은 자유롭게 만들되 **`feature` 라벨을 붙이지 않는다** —
그 라벨은 생성된 태스크 67건의 표식이다.
