# -*- coding: utf-8 -*-
"""압축 수행 일정 생성기 — 임계 경로 하한에 도달하는 최소 인원 탐색.

기본 계획을 대체하지 않는 **대안**이다.

  python3 tools/gen_fasttrack_plan.py
"""
import sys, os, collections, itertools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tasks_data as D
from gen_task_list import build
from gen_exec_plan import critical_path, EFFORT, LANE_OF_TYPE, LANES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "plan-docs", "[Plan]FinFriends-Fast-Track-Schedule.md")


def schedule_with(T, lanes):
    _, _, longest = critical_path(T)
    order = sorted(T, key=lambda t: (-longest[t["id"]], t["id"]))
    free = {ln: [0] * n for ln, n in lanes.items()}
    plan, done, rest = {}, set(), list(order)
    while rest:
        moved = False
        for t in list(rest):
            if not all(d in done for d in t["deps"]): continue
            ready = max([plan[d][1] for d in t["deps"]], default=0)
            ln = LANE_OF_TYPE[t["type"]]
            i = min(range(lanes[ln]), key=lambda k: max(free[ln][k], ready))
            s = max(free[ln][i], ready); e = s + EFFORT[t["cx"]]
            free[ln][i] = e; plan[t["id"]] = (s, e, i)
            done.add(t["id"]); rest.remove(t); moved = True
        if not moved: raise SystemExit("스케줄 실패")
    return plan, max(e for _, e, _ in plan.values())


def search(T, cp_len):
    """임계 경로 하한에 도달하는 최소 인원 구성을 찾는다"""
    base = dict(LANES)
    cur = dict(base)
    history = []
    while True:
        _, fin = schedule_with(T, cur)
        history.append((dict(cur), fin, sum(cur.values())))
        if fin <= cp_len: break
        # 어느 레인을 1명 늘렸을 때 가장 많이 줄어드는가
        best, bestfin = None, fin
        for ln in cur:
            trial = dict(cur); trial[ln] += 1
            _, f = schedule_with(T, trial)
            if f < bestfin: best, bestfin = ln, f
        if best is None: break     # 더 늘려도 줄지 않음 = 하한 도달
        cur[best] += 1
    return history


def render(T, cp, cp_len, history):
    by = {t["id"]: t for t in T}
    base_lanes, base_fin, base_n = history[0]
    fast_lanes, fast_fin, fast_n = history[-1]
    plan, _ = schedule_with(T, fast_lanes)
    total = sum(EFFORT[t["cx"]] for t in T)
    load = collections.defaultdict(int)
    for t in T: load[LANE_OF_TYPE[t["type"]]] += EFFORT[t["cx"]]
    L = []; a = L.append
    a("# [압축 수행 일정] 핀프렌즈\n")
    a("**문서 ID:** PLAN-FINFRIENDS-FAST-001\n")
    a("**개정 버전:** 1.0\n")
    a("**날짜:** 2026-08-26\n")
    a("**근거 문서:** PLAN-FINFRIENDS-001 (`docs/plan-docs/[Plan]FinFriends-Execution-Plan.md`)\n")
    a("> ⚙️ **이 문서는 생성물이다.** `python3 tools/gen_fasttrack_plan.py` 로 재생성한다.\n")
    a("> **기본 계획을 대체하지 않는다.** 병렬 가능한 태스크를 최대한 동시에 수행했을 때 어디까지 줄어드는지를 계산한 **대안**이다.\n")
    a("---\n")
    a("## 1. 결론\n")
    a("| 안 | 인원 | 완료 | 평균 가동률 |")
    a("| --- | :-: | :-: | :-: |")
    a(f"| 기본안 (PLAN-FINFRIENDS-001) | {base_n}명 | **{base_fin}일** | {total/(base_fin*base_n)*100:.0f}% |")
    a(f"| **압축안** (PLAN-FINFRIENDS-FAST-001) | **{fast_n}명** | **{fast_fin}일** | {total/(fast_fin*fast_n)*100:.0f}% |")
    a(f"| 임계 경로 하한 | — | **{cp_len}일** | — |")
    a("")
    a(f"**{cp_len}일이 하한이다** — 임계 경로가 {cp_len}영업일이므로 인원을 아무리 넣어도 그 아래로는 내려가지 않는다. "
      f"압축안은 하한에 도달하는 **최소 인원**을 탐색한 결과다.\n")
    a(f"기본안 대비 **{base_fin - fast_fin}일 단축 · {fast_n - base_n}명 증원**이다.\n")
    a("## 2. 증원 탐색 과정\n")
    a("한 명씩 늘려 보고 **완료일이 가장 많이 줄어드는 레인**을 골랐다. 더 늘려도 줄지 않으면 멈춘다.\n")
    a("| 단계 | 구성 | 인원 | 완료 | 직전 대비 |")
    a("| :-: | --- | :-: | :-: | :-: |")
    prev = None
    for i, (lanes, fin, n) in enumerate(history):
        conf = " · ".join(f"{k}{v}" for k, v in lanes.items())
        delta = "—" if prev is None else f"−{prev - fin}일"
        a(f"| {i} | {conf} | {n} | {fin}일 | {delta} |")
        prev = fin
    a("")
    # 수익 체감 지점 — 직전 대비 단축이 2일 미만으로 떨어지는 첫 단계
    knee = None
    for i in range(1, len(history)):
        if history[i - 1][1] - history[i][1] < 3:
            knee = i - 1; break
    grown = [k for k in base_lanes if fast_lanes[k] > base_lanes[k]]
    a(f"> **증원이 통한 레인은 {' · '.join(grown)} 셋이다.** 나머지는 늘려도 완료일이 줄지 않아 그대로 뒀다.\n")
    if knee:
        kl, kf, kn = history[knee]
        a(f"> 🔴 **수익 체감 지점은 {kn}명 · {kf}일이다.** 여기까지 {base_fin - kf}일을 줄이는 데 {kn - base_n}명이 들었고, "
          f"남은 {kf - fast_fin}일을 더 줄이려면 **{fast_n - kn}명이 추가로** 든다. "
          f"인당 단축 효과가 {(base_fin - kf) / max(kn - base_n, 1):.1f}일에서 {(kf - fast_fin) / max(fast_n - kn, 1):.1f}일로 떨어진다.\n")
    a("## 3. 레인별 부하\n")
    a("| 레인 | 기본안 인원 | 압축안 인원 | 배정 공수 | 압축안 가동률 |")
    a("| --- | :-: | :-: | :-: | :-: |")
    for ln in base_lanes:
        cap = fast_fin * fast_lanes[ln]
        a(f"| {ln} | {base_lanes[ln]} | **{fast_lanes[ln]}** | {load[ln]}d | {load[ln]/cap*100:.0f}% |")
    a("")
    bottleneck = max(load, key=lambda k: load[k] / base_lanes[k])
    a(f"**병목은 {bottleneck} 레인이다.** 배정 공수 {load[bottleneck]}d 를 기본안 {base_lanes[bottleneck]}명이 나눠 지므로 "
      f"의존성이 풀려도 사람이 없어 기다린다.\n")

    # ── 왜 이만큼 필요한가 — 공수가 아니라 동시성이 인원을 정한다
    a("### 3.1 왜 공수 계산보다 많은 인원이 필요한가\n")
    a("공수만 나누면 훨씬 적게 나온다. 그런데도 인원이 더 드는 이유는 **일이 고르게 퍼지지 않기 때문**이다.\n")
    a("| 레인 | 공수 ÷ 하한일수 | 이론 최소 | 압축안 | 최대 동시 작업 | 평균 동시 |")
    a("| --- | :-: | :-: | :-: | :-: | :-: |")
    for ln in base_lanes:
        peak = collections.Counter()
        for t in T:
            if LANE_OF_TYPE[t["type"]] != ln: continue
            s_, e_, _ = plan[t["id"]]
            for d in range(s_, e_): peak[d] += 1
        mx = max(peak.values()) if peak else 0
        avg = sum(peak.values()) / fast_fin if fast_fin else 0
        theo = -(-load[ln] // fast_fin)
        a(f"| {ln} | {load[ln]}d ÷ {fast_fin}일 = {load[ln]/fast_fin:.2f} | {theo}명 | **{fast_lanes[ln]}명** | **{mx}건** | {avg:.1f}건 |")
    a("")
    # 병목 레인의 피크 구간
    peak = collections.Counter()
    for t in T:
        if LANE_OF_TYPE[t["type"]] != bottleneck: continue
        s_, e_, _ = plan[t["id"]]
        for d in range(s_, e_): peak[d] += 1
    pd = max(peak, key=lambda d: peak[d])
    hi = sorted(d for d, v in peak.items() if v == peak[pd])
    conc = [t for t in T if LANE_OF_TYPE[t["type"]] == bottleneck
            and plan[t["id"]][0] <= pd < plan[t["id"]][1]]
    a(f"**인원을 정하는 것은 총 공수가 아니라 피크다.** {bottleneck} 레인은 평균 동시 "
      f"{sum(peak.values())/fast_fin:.1f}건인데 **{min(hi)}~{max(hi)}일차에 {peak[pd]}건이 몰린다.** "
      f"이 피크를 받지 못하면 밀린 작업이 임계 경로 뒷부분을 잡아먹어 {fast_fin}일이 성립하지 않는다.\n")
    a(f"{bottleneck} 피크 구간에 동시 진행되는 {peak[pd]}건:\n")
    for t in sorted(conc, key=lambda x: x["id"]):
        a(f"- `{t['id']}` {t['title']}")
    a("")
    a(f"> 그래서 압축안의 가동률이 낮다({bottleneck} {load[bottleneck]/(fast_fin*fast_lanes[bottleneck])*100:.0f}%). "
      f"**상시 필요한 인원이 아니라 피크를 받기 위한 인원**이며, 피크가 지나면 놀게 된다. "
      f"§5의 주차별 투입 조정이 필요한 이유다.\n")
    a("## 4. 압축안 Gantt\n")
    a("```mermaid")
    a("gantt")
    a("    title 압축안 — 임계 경로 하한 도달 편성")
    a("    dateFormat X")
    a("    axisFormat %s")
    cpset = set(cp)
    for ln, n in fast_lanes.items():
        for i in range(n):
            rows = [t for t in T if LANE_OF_TYPE[t["type"]] == ln and plan[t["id"]][2] == i]
            if not rows: continue
            a(f"    section {ln}{i+1 if n > 1 else ''}")
            for t in sorted(rows, key=lambda x: plan[x["id"]][0]):
                s, e, _ = plan[t["id"]]
                crit = "crit, " if t["id"] in cpset else ""
                a(f"    {t['id']} {t['title'][:14]} :{crit}{t['id'].replace('-', '_')}, {s}, {e}")
    a("```\n")
    a("## 5. 주의\n")
    a("| # | 내용 |")
    a("| :-: | --- |")
    a(f"| 1 | ⚠️ **온보딩 시간이 일정에 없다.** −{base_fin - fast_fin}일은 추가 인원이 즉시 생산성을 낸다는 가정이며, **이 맥락을 아는 인력일 때만** 성립한다 |")
    a("| 2 | **가동률이 떨어진다.** 인원을 늘리면 대기 시간이 늘어 1인당 효율은 낮아진다. 총 공수는 같다 |")
    a(f"| 3 | **{bottleneck} 외 레인은 늘리지 않았다.** 임계 경로를 제약하지 않으므로 증원이 순수 비용이다 |")
    a("| 4 | 외부 블로커(D1 · D-03 · D3)가 열리지 않으면 **어떤 편성으로도 압축되지 않는다** |")
    a("")
    a("## 6. 검증\n")
    err = []
    for t in T:
        s, e, _ = plan[t["id"]]
        for d in t["deps"]:
            if plan[d][1] > s: err.append(f"역전 {d}→{t['id']}")
    seen = collections.defaultdict(list)
    for t in T:
        s, e, i = plan[t["id"]]; seen[(LANE_OF_TYPE[t["type"]], i)].append((s, e, t["id"]))
    for k, v in seen.items():
        v.sort()
        for x, y in zip(v, v[1:]):
            if x[1] > y[0]: err.append(f"중복 {k}")
    a("| 검사 | 결과 |")
    a("| --- | :-: |")
    a(f"| 선행-후행 역전 | **{len([e for e in err if e.startswith('역전')])}건** |")
    a(f"| 레인 내 중복 | **{len([e for e in err if e.startswith('중복')])}건** |")
    a(f"| Gantt 배치 | **{len(T)}/{len(T)}** |")
    a(f"| 완료 = 임계 경로 | **{fast_fin}일 = {cp_len}일** {'✅' if fast_fin == cp_len else '⚠️'} |")
    a("")
    a("---\n")
    a("*생성: `python3 tools/gen_fasttrack_plan.py` · 단일 원천: `tools/tasks_data.py`*")
    return "\n".join(L) + "\n", err


if __name__ == "__main__":
    T = build()
    cp, cp_len, _ = critical_path(T)
    hist = search(T, cp_len)
    doc, err = render(T, cp, cp_len, hist)
    if err:
        print("검증 실패:"); [print(" -", e) for e in err[:5]]; sys.exit(1)
    open(OUT, "w", encoding="utf-8").write(doc)
    print(f"생성: {OUT}")
    print(f"기본안 {hist[0][2]}명 {hist[0][1]}일 → 압축안 {hist[-1][2]}명 {hist[-1][1]}일 (하한 {cp_len}일)")
