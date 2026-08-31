# -*- coding: utf-8 -*-
"""태스크 분석 수치 산출 — 분석 문서의 근거를 재현한다.

  python3 tools/analyze_tasks.py
분석 문서(docs/analysis-docs/)의 표에 들어간 숫자는 전부 여기서 나온다.
"""
import sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tasks_data as D
from gen_task_list import build

STEP_ORDER = {"Step 1": 1, "Step 2": 2, "Step 3": 3, "Step 4": 4, "—": 0}


def step_distribution(T):
    step = collections.defaultdict(list)
    for t in T: step[D.TYPE_STEP[t["type"]]].append(t)
    return step


def step_order_notes(T):
    """후행 단계가 선행 단계보다 먼저 오는 쌍 — 위반이 아니라 부트스트랩 관계"""
    by = {t["id"]: t for t in T}
    out = []
    for t in T:
        for d in t["deps"]:
            a, b = D.TYPE_STEP[by[d]["type"]], D.TYPE_STEP[t["type"]]
            if STEP_ORDER[b] and STEP_ORDER[a] > STEP_ORDER[b]:
                out.append((t["id"], t["type"], d, by[d]["type"]))
    return out


def merge_candidates(T):
    """같은 Epic · 같은 유형 · 직접 의존 · 복잡도 L/M 인 쌍"""
    by = {t["id"]: t for t in T}
    out = []
    for t in T:
        for d in t["deps"]:
            o = by[d]
            if o["epic"] == t["epic"] and o["type"] == t["type"] and {t["cx"], o["cx"]} <= {"L", "M"}:
                others = sorted(x["id"] for x in T if d in x["deps"] and x["id"] != t["id"])
                out.append((d, t["id"], t["epic"], t["type"], o["cx"], t["cx"], others))
    return out


if __name__ == "__main__":
    T = build()
    print("=== 방법론 4단계 분포 ===")
    st = step_distribution(T)
    for s in ("Step 1", "Step 2", "Step 3", "Step 4", "—"):
        ts = st.get(s, [])
        print(f"  {s:7} {len(ts):>2}건 ({len(ts)/len(T)*100:>4.1f}%)  "
              f"{dict(collections.Counter(t['type'] for t in ts))}")
    print(f"  합계     {len(T)}건")

    print("\n=== 단계 역순 의존 (부트스트랩) ===")
    for a, at, b, bt in step_order_notes(T):
        print(f"  {a}({at}) ← {b}({bt})")
    print(f"  {len(step_order_notes(T))}건")

    print("\n=== 축약 후보 ===")
    for d, t, e, ty, c1, c2, others in merge_candidates(T):
        print(f"  {d} + {t}  {e}/{ty} {c1}+{c2}  {d}의 다른 후행 {len(others)}건 {others}")
    print(f"  {len(merge_candidates(T))}쌍")

    print("\n=== 복잡도 L ===")
    for t in T:
        if t["cx"] == "L":
            print(f"  {t['id']} 후행 {len(t['blocks'])}건 · {t['title'][:40]}")

    print("\n=== 블로커 보유 태스크 ===")
    for t in T:
        blk = [c for c in t["cons"] if "미해소" in c or "착수 불가" in c or "블로커" in c]
        if blk: print(f"  {t['id']} — {blk[0][:70]}")
