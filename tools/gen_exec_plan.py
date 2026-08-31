# -*- coding: utf-8 -*-
"""개발 실행 계획 생성기 — DAG · 임계 경로 · 자원 제약 일정.

  python3 tools/gen_exec_plan.py
"""
import sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tasks_data as D
from gen_task_list import build, EPIC_NAME

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "plan-docs", "[Plan]FinFriends-Execution-Plan.md")

EFFORT = {"H": 5, "M": 3, "L": 1}          # person-day
LANE_OF_TYPE = {
    "Infra": "플랫폼", "NFR": "플랫폼",
    "Contract": "백엔드", "Data": "백엔드", "Write": "백엔드", "Read": "백엔드",
    "UI": "프론트", "Design": "디자인", "Test": "QA",
}
LANES = {"플랫폼": 1, "백엔드": 2, "프론트": 1, "디자인": 1, "QA": 1}


def critical_path(T):
    by = {t["id"]: t for t in T}
    dep = {t["id"]: t["deps"] for t in T}
    memo, prev = {}, {}
    def f(n):
        if n in memo: return memo[n]
        e = EFFORT[by[n]["cx"]]
        if not dep[n]:
            memo[n] = e; prev[n] = None
        else:
            best, bp = 0, None
            for d in dep[n]:
                v = f(d)
                if v > best: best, bp = v, d
            memo[n] = best + e; prev[n] = bp
        return memo[n]
    for t in T: f(t["id"])
    end = max(memo, key=lambda k: memo[k])
    path, cur = [], end
    while cur: path.append(cur); cur = prev[cur]
    return list(reversed(path)), memo[end], memo


def schedule(T):
    """자원 제약 리스트 스케줄링. 반환: {id: (start, end, lane_index)}"""
    by = {t["id"]: t for t in T}
    _, _, longest = critical_path(T)
    order = sorted(T, key=lambda t: (-longest[t["id"]], t["id"]))
    lane_free = {ln: [0] * n for ln, n in LANES.items()}
    plan = {}
    done = set()
    remaining = list(order)
    while remaining:
        progressed = False
        for t in list(remaining):
            if not all(d in done for d in t["deps"]):
                continue
            ready = max([plan[d][1] for d in t["deps"]], default=0)
            ln = LANE_OF_TYPE[t["type"]]
            idx = min(range(LANES[ln]), key=lambda i: max(lane_free[ln][i], ready))
            start = max(lane_free[ln][idx], ready)
            end = start + EFFORT[t["cx"]]
            lane_free[ln][idx] = end
            plan[t["id"]] = (start, end, idx)
            done.add(t["id"]); remaining.remove(t); progressed = True
        if not progressed:
            raise SystemExit("스케줄 실패 — 해소되지 않은 의존성")
    return plan


def verify(T, plan):
    err = []
    for t in T:
        s, e, _ = plan[t["id"]]
        for d in t["deps"]:
            if plan[d][1] > s:
                err.append(f"역전: {d}({plan[d][1]}) → {t['id']}({s})")
    seen = collections.defaultdict(list)
    for t in T:
        s, e, i = plan[t["id"]]
        seen[(LANE_OF_TYPE[t["type"]], i)].append((s, e, t["id"]))
    for k, v in seen.items():
        v.sort()
        for a, b in zip(v, v[1:]):
            if a[1] > b[0]: err.append(f"레인 중복 {k}: {a[2]} / {b[2]}")
    return err


def render(T, plan, cp, cp_len):
    by = {t["id"]: t for t in T}
    total_effort = sum(EFFORT[t["cx"]] for t in T)
    finish = max(e for _, e, _ in plan.values())
    lane_load = collections.defaultdict(float)
    for t in T:
        lane_load[LANE_OF_TYPE[t["type"]]] += EFFORT[t["cx"]]
    L = []; a = L.append
    a("# [총괄] 개발 실행 계획\n")
    a("**문서 ID:** PLAN-FINFRIENDS-001\n")
    a("**개정 버전:** 1.0\n")
    a("**날짜:** 2026-08-26\n")
    a("**근거 문서:** TASK-FINFRIENDS-MVP-001 (`[TaskList]FinFriends-Task-List.md`)\n")
    a("> ⚙️ **이 문서는 생성물이다.** `python3 tools/gen_exec_plan.py` 로 재생성한다. "
      "일정·임계 경로·Gantt는 태스크 데이터에서 계산한 결과이며 수기로 고치지 않는다.\n")
    a("---\n")
    a("## 1. 요약\n")
    a("| 항목 | 값 |")
    a("| --- | :-: |")
    a(f"| 태스크 | **{len(T)}건** |")
    a(f"| 총 공수 | **{total_effort} person-day** |")
    a(f"| DAG 레벨 | **{max(t['level'] for t in T) + 1}단계** |")
    a(f"| 임계 경로 | **{cp_len}일 · {len(cp)}단계** |")
    a(f"| 자원 제약 완료 | **{finish}일** |")
    a(f"| 트랙 구성 | **{sum(LANES.values())}레인** — " + " · ".join(f"{k}{v}" for k, v in LANES.items()) + " |")
    a("")
    a("> **공수 환산** — 복잡도 H **5일** · M **3일** · L **1일**. 실측 없이 상대 규모만 반영한 값이며, "
      "확정 견적이 아니라 **순서와 병목을 드러내기 위한 척도**다.\n")
    a("## 2. 실행 전략\n")
    a("### 2.1 네 가지 원칙\n")
    a("1. **게이트 우선** — `TEC-001` 제약 게이트를 가장 먼저 세운다. 나중에 세우면 그때까지의 위반이 한꺼번에 드러난다.")
    a("2. **계약 우선** — `CTR-001` · `CTR-002` 가 없으면 두 태스크가 같은 계약을 다르게 구현해도 탐지되지 않는다.")
    a("3. **디자인 선행** — `UX-001` 은 선행 태스크가 없다. 프론트 태스크가 대기하지 않도록 첫날 착수한다.")
    a("4. **규제 먼저** — `CON-002` 동의 게이트는 아동 화면 전부의 선행 조건이다. 늦추면 아동 기능이 통째로 밀린다.\n")
    a("### 2.2 착수 전 외부 블로커\n")
    a("| 블로커 | 막는 태스크 | 확정 시점 |")
    a("| --- | --- | --- |")
    a("| **D1** 제휴사 수수료율 · SLA · 업종 코드 상세도 | PTN-001 · PTN-003 · PLN-002 | 제휴 계약 체결 전 |")
    a("| **D-03** 본인인증 위임 가능 여부 | CON-003 · PTN-001 | 온보딩 착수 전 |")
    a("| **D3** 학습 4영역 원고 | DAT-003 · LRN-001 | LRN-001 착수 전 |")
    a("| **D4** 3D/아바타 사양 | STR-003 · UX-003 | 제작 착수 전 (B4 게이트) |")
    a("| **D2** 예적금 법률 검토 | LRN-003 | Could Have — 미확정 시 이월 |")
    a("")
    a("## 3. 의존성 구조\n")
    a("### 3.1 Epic 수준 DAG\n")
    a("```mermaid")
    a("flowchart LR")
    epic_dep = collections.defaultdict(set)
    for t in T:
        for d in t["deps"]:
            de = by[d]["epic"]
            if de != t["epic"]: epic_dep[de].add(t["epic"])
    for e, name in D.EPICS:
        if any(t["epic"] == e for t in T):
            a(f'    {e}["{e}<br/>{name}"]')
    for src, dsts in sorted(epic_dep.items()):
        for d in sorted(dsts): a(f"    {src} --> {d}")
    a("```\n")
    a("### 3.2 임계 경로\n")
    a(f"**{cp_len}영업일 · {len(cp)}단계** — 이 사슬이 전체 일정의 하한이다.\n")
    a("```mermaid")
    a("flowchart LR")
    for i, n in enumerate(cp):
        t = by[n]
        a(f'    {n.replace("-", "_")}["{n}<br/>{t["title"][:22]}<br/>{EFFORT[t["cx"]]}d"]')
        if i: a(f"    {cp[i-1].replace('-', '_')} --> {n.replace('-', '_')}")
    a("    classDef crit fill:#ffe0e0,stroke:#c00,stroke-width:2px")
    a("    class " + ",".join(n.replace("-", "_") for n in cp) + " crit")
    a("```\n")
    a("| # | 태스크 | 기능 | 공수 |")
    a("| :-: | :-: | --- | :-: |")
    for i, n in enumerate(cp, 1):
        a(f"| {i} | **{n}** | {by[n]['title']} | {EFFORT[by[n]['cx']]}d |")
    a(f"| | | **합계** | **{cp_len}d** |")
    a("")
    a("### 3.3 병목 — 후행이 많은 태스크\n")
    a("| 태스크 | 후행 수 | 밀리면 |")
    a("| :-: | :-: | --- |")
    for t in sorted(T, key=lambda x: -len(x["blocks"]))[:6]:
        if t["blocks"]:
            a(f"| **{t['id']}** | {len(t['blocks'])} | {len(t['blocks'])}개 태스크가 함께 밀린다 |")
    a("")
    a("## 4. 일정\n")
    a("### 4.1 트랙별 Gantt\n")
    a("```mermaid")
    a("gantt")
    a("    title 핀프렌즈 MVP 실행 일정 (영업일 기준)")
    a("    dateFormat X")
    a("    axisFormat %s")
    cpset = set(cp)
    for ln in LANES:
        for i in range(LANES[ln]):
            rows = [t for t in T if LANE_OF_TYPE[t["type"]] == ln and plan[t["id"]][2] == i]
            if not rows: continue
            a(f"    section {ln}{i+1 if LANES[ln] > 1 else ''}")
            for t in sorted(rows, key=lambda x: plan[x["id"]][0]):
                s, e, _ = plan[t["id"]]
                crit = "crit, " if t["id"] in cpset else ""
                a(f"    {t['id']} {t['title'][:16]} :{crit}{t['id'].replace('-', '_')}, {s}, {e}")
    a("```\n")
    a("### 4.2 스프린트별 착수\n")
    a("| 스프린트 | 태스크 | 건수 |")
    a("| :-: | --- | :-: |")
    for s in sorted({t["sprint"] for t in T}):
        ids = [t["id"] for t in sorted(T, key=lambda x: x["id"]) if t["sprint"] == s]
        a(f"| **{s}** | {' · '.join(ids)} | {len(ids)} |")
    a("")
    a("### 4.3 레인 가동률\n")
    a("| 레인 | 인원 | 배정 공수 | 가동률 |")
    a("| --- | :-: | :-: | :-: |")
    for ln, n in LANES.items():
        cap = finish * n
        a(f"| {ln} | {n} | {int(lane_load[ln])}d | {lane_load[ln]/cap*100:.0f}% |")
    a("")
    a("> 가동률이 낮은 레인은 **증원 대상이 아니다.** 임계 경로를 제약하지 않으므로 인원을 늘려도 완료일이 앞당겨지지 않는다.\n")
    a("## 5. 게이트와 중단 조건\n")
    a("| 게이트 | 조건 | 미달 시 |")
    a("| --- | --- | --- |")
    a("| **제약 게이트** (상시) | `prebuild` 5종 통과 | 배포 차단 |")
    a("| **α 내부** | 규제 상수 자동 테스트 100% · 별 원장 불일치 0건 · 보안 S1~S6 0건 | α 진입 불가 |")
    a("| **β 클로즈드** | E4 PASS(첫 실천 인정률 ≥ 60%) · E1 PASS(회상 ≥ 6/8) · WPA ≥ 5/8 | 로드맵 재검토 |")
    a("| **일반 공개** | WPA ≥ 55% 2주 연속 · 정지→인지 ≤ 3일 · 정합성 오류 0건 · **미해소 3건 처리** | 공개 보류 |")
    a("")
    a("## 6. 리스크\n")
    a("| # | 리스크 | 일정 영향 | 완화 |")
    a("| :-: | --- | --- | --- |")
    a("| R-1 | **D1 제휴사 조건 미확정** | PTN·PLN 계열 전체 대기 | 계획 카드 CRUD(PLN-001)만 선행하고 매칭(PLN-002)을 분리 착수 |")
    a("| R-2 | **D3 콘텐츠 원고 지연** | LRN·DAT 계열 대기 | 시드 스키마를 먼저 확정하고 원고는 후속 주입 |")
    a("| R-3 | **제약 게이트 지연** | 위반이 누적된 뒤 한꺼번에 드러남 | TEC-001을 최우선 배치 (원칙 1) |")
    a("| R-4 | **D-01 문자 채널 미승인** | NTF-003 일부 미구현 | 배너로 개시하고 미구현을 대장에 남김 |")
    a("| R-5 | 계획 카드 작성률 미달 | PLN 계열 재설계 | 운영 4주 실측(E3) 후 판정 |")
    a("")
    a("## 7. 검증 결과\n")
    a("| 검사 | 결과 |")
    a("| --- | :-: |")
    a(f"| 선행-후행 시간 역전 | **0건** |")
    a(f"| 레인 내 시간 중복 | **0건** |")
    a(f"| Gantt 배치 | **{len(T)}/{len(T)}건 · 중복 0** |")
    a(f"| DAG 노드 | **{len(T)}/{len(T)} · 누락 0** |")
    a(f"| DAG 간선 | **{sum(len(t['deps']) for t in T)}건** |")
    a(f"| 임계 경로 = 하한 | **{cp_len}일** (자원 제약 완료 {finish}일) |")
    a("")
    a("---\n")
    a("*생성: `python3 tools/gen_exec_plan.py` · 단일 원천: `tools/tasks_data.py`*")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    T = build()
    cp, cp_len, _ = critical_path(T)
    plan = schedule(T)
    err = verify(T, plan)
    if err:
        print("일정 검증 실패:"); [print(" -", e) for e in err]; sys.exit(1)
    open(OUT, "w", encoding="utf-8").write(render(T, plan, cp, cp_len))
    finish = max(e for _, e, _ in plan.values())
    print(f"생성: {OUT}")
    print(f"임계 경로 {cp_len}일 · 자원 제약 완료 {finish}일 · 역전 0 · 중복 0")
