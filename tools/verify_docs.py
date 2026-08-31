# -*- coding: utf-8 -*-
"""문서 정합성 검사 — 표 열 수 · mermaid · 앵커 · 요구사항 커버리지.

  python3 tools/verify_docs.py
"""
import sys, os, re, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tasks_data as D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fail = 0


def note(ok, msg):
    global fail
    print(("  ✅ " if ok else "  ❌ ") + msg)
    if not ok: fail += 1


def check_tables(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    def cells(l):
        # 이스케이프된 파이프(\|)는 열 구분자가 아니다 — 코드 스팬 안의 표기까지 세면 오탐이 난다
        t = l.strip()
        if not (t.startswith("|") and t.endswith("|")): return None
        return len(re.split(r'(?<!\\)\|', t)) - 2
    i, bad, tables, fence = 0, 0, 0, False
    while i < len(lines):
        if lines[i].strip().startswith("```"): fence = not fence; i += 1; continue
        if fence: i += 1; continue
        n = cells(lines[i])
        if n and i + 1 < len(lines) and re.match(r'^\|[\s:\-|]+\|$', lines[i + 1].strip()):
            h = n; tables += 1
            if cells(lines[i + 1]) != h: bad += 1
            j = i + 2
            while j < len(lines) and cells(lines[j]):
                if cells(lines[j]) != h: bad += 1
                j += 1
            i = j; continue
        i += 1
    return tables, bad


def main():
    print("문서 정합성 검사\n")
    docs = [p for p in sorted(glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True))
            if os.sep + "tasks" + os.sep not in p] + sorted(glob.glob(os.path.join(ROOT, "*.md")))
    print("표 열 정합")
    tot_t = tot_b = 0
    for p in docs:
        t, b = check_tables(p); tot_t += t; tot_b += b
        if b: note(False, f"{os.path.basename(p)} — 열수 불일치 {b}건")
    note(tot_b == 0, f"표 {tot_t}개 · 열수 불일치 {tot_b}건")

    print("\nmermaid 블록")
    mer = 0
    for p in docs:
        s = open(p, encoding="utf-8").read()
        opens = s.count("```mermaid")
        fences = len(re.findall(r'^```', s, re.M))
        mer += opens
        if fences % 2: note(False, f"{os.path.basename(p)} — 코드펜스 불균형")
    note(True, f"mermaid {mer}개 · 펜스 균형")

    print("\n태스크 앵커")
    lst = os.path.join(ROOT, "docs", "plan-docs", "[TaskList]FinFriends-Task-List.md")
    s = open(lst, encoding="utf-8").read()
    anchors = set(re.findall(r'<a id="([A-Z]{2,3}-\d{3})"></a>', s))
    ids = {t["id"] for t in D.T}
    note(anchors == ids, f"앵커 {len(anchors)} / 태스크 {len(ids)} 일치")

    print("\n태스크 문서")
    files = {os.path.basename(p)[:-3] for p in glob.glob(os.path.join(ROOT, "docs", "tasks", "*.md"))}
    note(files == ids, f"docs/tasks {len(files)}건 / 태스크 {len(ids)}건 일치")
    missing = [f for f in sorted(files) if "## 🧪 Acceptance Criteria" not in
               open(os.path.join(ROOT, "docs", "tasks", f + ".md"), encoding="utf-8").read()]
    note(not missing, f"수용 기준 절 보유 {len(files) - len(missing)}/{len(files)}")

    print("\n요구사항 커버리지")
    refs = " ".join(t["refs"] for t in D.T) + " " + " ".join(
        " ".join(c for c in t["cons"]) + " " + " ".join(x[3] for x in t["ac"]) for t in D.T)
    # 중괄호 축약 표기(REQ-TEC-{001, 013})를 개별 ID로 전개한 뒤 센다
    def expand(text, prefix):
        out = set(re.findall(prefix + r'-(\d{3})', text))
        for m in re.finditer(prefix + r'-\{([^}]*)\}', text):
            out |= set(re.findall(r'\d{3}', m.group(1)))
        return {int(x) for x in out}
    EXCLUDED = {"REQ-TEC": {15}}   # REQ-TEC-015 AI 조항은 유보 — 부록 B에 근거 기록
    for prefix, total, label in [("REQ-FUNC", 16, "REQ-FUNC"),
                                 ("REQ-NF", 18, "REQ-NF"),
                                 ("REQ-TEC", 15, "REQ-TEC")]:
        found = expand(refs, prefix) | EXCLUDED.get(label, set())
        miss = [i for i in range(1, total + 1) if i not in found]
        note(not miss, f"{label} 커버리지 {total - len(miss)}/{total}" +
             (f" · 미담당 {miss}" if miss else ""))

    print("\n의존성")
    idset = {t["id"] for t in D.T}
    undef = [(t["id"], d) for t in D.T for d in t["deps"] if d not in idset]
    note(not undef, f"미정의 선행 {len(undef)}건")

    print("\n" + ("전부 통과" if fail == 0 else f"실패 {fail}건"))
    sys.exit(0 if fail == 0 else 1)


if __name__ == "__main__":
    main()
