# -*- coding: utf-8 -*-
"""GitHub 이슈 템플릿 생성 — .github/ISSUE_TEMPLATE/feature-task.md"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, ".github", "ISSUE_TEMPLATE", "feature-task.md")
TPL = """---
name: TASK
about: SRS 기반의 구체적인 개발 태스크 명세
title: "[Feature] <TASK-ID>: <기능명>"
labels: 'feature'
assignees: ''
---

## 🎯 Summary
- 기능명:
- Epic: · 유형: · 복잡도: · 스프린트:
- 목적:

## 🔗 References (Spec & Context)
> 💡 작업 시작 전 아래 문서를 반드시 먼저 Read/Evaluate 할 것.
- 태스크 리스트: `/docs/plan-docs/[TaskList]FinFriends-Task-List.md#<TASK-ID>`
- SRS 문서(기술제약 반영판): `/docs/tech-design-docs/[SRS]FinFriends-SRS-Tech-v1_0.md`
- SRS 문서(기술 중립판): `/docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md`
- 입력 PRD: `/[PRD]FinFriends-PRD-v1_0.md`

## ✅ Task Breakdown (실행 계획)
- [ ]

## 🧪 Acceptance Criteria (BDD/GWT)

Scenario 1:
- Given:
- When:
- Then:

## ⚙️ Technical & Non-Functional Constraints
-

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria를 충족하는가?
- [ ] 단위 테스트 및 통합 테스트가 추가되었고 통과하는가?
- [ ] `prebuild` 제약 게이트 5종을 통과하는가?
- [ ] Vercel 프리뷰 배포가 성공했는가?
- [ ] 관련 계측 이벤트가 적재되는가?

## 🚧 Dependencies & Blockers
- Depends on:
- Blocks:
- External Blocker:
"""
if __name__ == "__main__":
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(TPL)
    print("생성:", OUT)
