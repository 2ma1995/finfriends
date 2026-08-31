# 워크플로 — SRS에서 태스크 도출

**이 저장소는 이미 태스크 67건이 도출돼 있다.** 이 문서는 **다시 도출해야 할 때**의 절차다.

## 언제 쓰나

- SRS에 요구사항이 추가·삭제됐을 때
- 미해소 3건(D-01 · D-02 · D-03)이 닫혀 조정된 요구사항이 되돌아갈 때

## 절차

```
1. 기술제약 반영판 SRS를 기준으로 삼는다
   — 중립판이 아니다. 반영판만이 구현 단위(§6.1 진입점 19개)를 확정한다

2. 4단계로 추출한다
   Step 1  Contract · Data   공유 계약과 데이터 모양
   Step 2  Read · Write · UI 동작
   Step 3  Test              수용 기준의 실행 가능한 대응물
   Step 4  Infra · NFR       배선 · 게이트 · 관측 · 비용

3. tools/tasks_data.py 에 레코드를 추가한다
   id · epic · title · type · refs · deps · cx · part
   purpose · breakdown · ac · cons · dod

4. 생성기를 돌린다
   python3 tools/gen_task_list.py     검증에 걸리면 문서를 쓰지 않는다
   python3 tools/gen_task_docs.py
   python3 tools/gen_exec_plan.py
   python3 tools/gen_fasttrack_plan.py

5. 검증한다
   python3 tools/verify_docs.py       요구사항 커버리지 포함
   python3 tools/verify_links.py
   python3 tools/analyze_tasks.py     단계 분포 · 병합 후보
```

## 규칙

- **SRS에 없는 기능을 태스크로 만들지 않는다**
- **후행 태스크(Blocks)를 수기로 적지 않는다** — 선행에서 역산된다
- 커버리지 검사가 미담당 요구사항을 지목하면 **태스크를 승격**한다 (실제로 2건 승격된 이력이 있다)
- 병합을 검토할 때는 `[Analysis]Task-Consolidation-Review.md` **원칙 5가지**를 적용한다
