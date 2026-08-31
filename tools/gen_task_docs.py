# -*- coding: utf-8 -*-
"""태스크별 GitHub Issue 명세 생성기.

  python3 tools/gen_task_docs.py            docs/tasks/*.md 생성
  python3 tools/gen_task_docs.py --check    데이터-문서 일치 확인
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tasks_data as D
from gen_task_list import build, EPIC_NAME

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "docs", "tasks")

NEUTRAL = "/docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md"
TECDOC = "/docs/tech-design-docs/[SRS]FinFriends-SRS-Tech-v1_0.md"
LIST = "/docs/plan-docs/[TaskList]FinFriends-Task-List.md"

PART_LABEL = {"A": "backend", "B": "design"}


def render(t):
    L = []; a = L.append
    labels = f"feature, part:{PART_LABEL[t['part']]}, epic:{t['epic']}, complexity:{t['cx']}, sprint:{t['sprint']}, type:{t['type'].lower()}"
    a("---")
    a("name: GitHub Project 용 TASK 템플릿")
    a("about: SRS 기반의 구체적인 개발 태스크 명세")
    a(f'title: "[Feature] {t["id"]}: {t["title"]}"')
    a(f"labels: '{labels}'")
    a("assignees: ''")
    a("---\n")

    a("## 🎯 Summary")
    a(f"- 기능명: [{t['id']}] {t['title']}")
    a(f"- Epic: {EPIC_NAME[t['epic']]} · 유형: `{t['type']}` · 복잡도: {t['cx']} · 스프린트: {t['sprint']}")
    a(f"- 목적: {t['purpose']}\n")

    a("## 🔗 References (Spec & Context)")
    a("> 💡 AI Agent & Dev Note: 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.")
    a(f"- 태스크 리스트: `{LIST}#{t['id']}`")
    a(f"- SRS 문서(기술제약 반영판): `{TECDOC}` — {t['refs']}")
    neutral_refs = [r.strip() for r in t["refs"].split("·") if "중립판" in r]
    if neutral_refs:
        a(f"- SRS 문서(기술 중립판): `{NEUTRAL}` — {' · '.join(neutral_refs)}")
    else:
        a(f"- SRS 문서(기술 중립판): `{NEUTRAL}` — 요구사항 ID는 두 문서가 공유한다")
    a("- 입력 PRD: `/docs/tech-design-docs/[PRD]FinFriends-PRD-v1_0.md` — 요구사항의 출처")
    a("- 포맷 기준: `/docs/source-docs/[SRS]AD-Core-Platform-Reference.md`\n")

    a("## ✅ Task Breakdown (실행 계획)")
    for b in t["breakdown"]:
        a(f"- [ ] {b}")
    a("")

    a("## 🧪 Acceptance Criteria (BDD/GWT)\n")
    for i, (title, g, w, th) in enumerate(t["ac"], 1):
        a(f"Scenario {i}: {title}")
        a(f"- Given: {g}")
        a(f"- When: {w}")
        a(f"- Then: {th}\n")

    a("## ⚙️ Technical & Non-Functional Constraints")
    for c in t["cons"]:
        a(f"- {c}")
    a("")

    a("## 🏁 Definition of Done (DoD)")
    a("- [ ] 모든 Acceptance Criteria를 충족하는가?")
    a("- [ ] 단위 테스트 및 통합 테스트가 추가되었고 통과하는가?")
    a("- [ ] `prebuild` 제약 게이트 5종을 통과하는가? <!-- REQ-TEC-002 · 004 · 007 · 008 · 009 -->")
    a("- [ ] Vercel 프리뷰 배포가 성공했는가? <!-- 빌드 실패 = 배포 차단 (C-TEC-007 · ADR-T08) -->")
    a("- [ ] 관련 계측 이벤트가 적재되는가? <!-- 해당 시 · 중립판 §6.1 -->")
    for d in t.get("dod", []):
        a(f"- [ ] {d}")
    a("")

    a("## 🚧 Dependencies & Blockers")
    if t["deps"]:
        a("- Depends on: " + " · ".join(f"#<이슈번호> ({d})" for d in t["deps"]))
    else:
        a("- Depends on: 없음 — **착수 가능**")
    if t["blocks"]:
        a("- Blocks: " + " · ".join(f"#<이슈번호> ({b})" for b in t["blocks"]))
    else:
        a("- Blocks: 없음")
    ext = [c for c in t["cons"] if "미해소" in c or "외부 의존" in c or "외부 선행" in c]
    a("- External Blocker: " + (ext[0] if ext else "없음"))
    n = len(t["blocks"])
    if n >= 5:
        a(f"- ⚠️ **후행 {n}건** — 이 태스크가 밀리면 {n}개가 함께 밀린다.")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    T = build()
    os.makedirs(OUTDIR, exist_ok=True)
    check = "--check" in sys.argv
    bad = 0
    for t in T:
        path = os.path.join(OUTDIR, t["id"] + ".md")
        doc = render(t)
        if check:
            cur = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
            if cur != doc: bad += 1; print("불일치:", t["id"])
        else:
            open(path, "w", encoding="utf-8").write(doc)
    if check:
        print("전부 일치" if bad == 0 else f"불일치 {bad}건")
        sys.exit(0 if bad == 0 else 1)
    print(f"생성: {OUTDIR} — {len(T)}건")
