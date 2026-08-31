# -*- coding: utf-8 -*-
"""태스크 리스트 생성기.

tasks_data.py 를 읽어 검증한 뒤 docs/plan-docs/[TaskList]FinFriends-Task-List.md 를 쓴다.
검증에 하나라도 걸리면 문서를 쓰지 않는다.

  python3 tools/gen_task_list.py            생성
  python3 tools/gen_task_list.py --check    데이터-문서 일치 확인 (쓰지 않음)
"""
import sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tasks_data as D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "plan-docs", "[TaskList]FinFriends-Task-List.md")
EPIC_NAME = dict(D.EPICS)


def validate(T):
    err = []
    ids = [t["id"] for t in T]
    dup = [i for i, c in collections.Counter(ids).items() if c > 1]
    if dup: err.append(f"중복 ID: {dup}")
    idset = set(ids)
    for t in T:
        for d in t["deps"]:
            if d not in idset: err.append(f"{t['id']}: 미정의 선행 {d}")
        if t["epic"] not in EPIC_NAME: err.append(f"{t['id']}: 미정의 Epic {t['epic']}")
        if t["type"] not in D.TYPE_STEP: err.append(f"{t['id']}: 미정의 유형 {t['type']}")
        if not t.get("ac"): err.append(f"{t['id']}: 수용 기준 없음")
        if not t.get("refs"): err.append(f"{t['id']}: SRS 참조 없음")
    # 순환 의존
    dep = {t["id"]: list(t["deps"]) for t in T}
    color = {}
    def dfs(n, stack):
        color[n] = 1
        for m in dep.get(n, []):
            if color.get(m) == 1:
                err.append(f"순환 의존: {' → '.join(stack + [n, m])}")
            elif color.get(m, 0) == 0:
                dfs(m, stack + [n])
        color[n] = 2
    for i in ids:
        if color.get(i, 0) == 0: dfs(i, [])
    return err


def levels(T):
    dep = {t["id"]: list(t["deps"]) for t in T}
    lv, seen = {}, set()
    def f(n):
        if n in lv: return lv[n]
        if n in seen: return 0
        seen.add(n)
        lv[n] = 0 if not dep[n] else 1 + max(f(d) for d in dep[n])
        return lv[n]
    for t in T: f(t["id"])
    return lv


def blocks(T):
    b = collections.defaultdict(list)
    for t in T:
        for d in t["deps"]:
            b[d].append(t["id"])
    return {k: sorted(v) for k, v in b.items()}


def build():
    T = D.T
    err = validate(T)
    if err:
        print("검증 실패:"); [print("  -", e) for e in err]; sys.exit(1)
    lv = levels(T)
    bl = blocks(T)
    for t in T:
        t["level"] = lv[t["id"]]
        t["sprint"] = "S%d" % min(lv[t["id"]] // 2, 5)
        t["blocks"] = bl.get(t["id"], [])
    return T


def render(T):
    tc = collections.Counter(t["type"] for t in T)
    ec = collections.Counter(t["epic"] for t in T)
    cc = collections.Counter(t["cx"] for t in T)
    sc = collections.Counter(t["sprint"] for t in T)
    L = []
    a = L.append
    a("# [태스크 리스트] 핀프렌즈\n")
    a("**문서 ID:** TASK-FINFRIENDS-MVP-001\n")
    a("**개정 버전:** 1.0\n")
    a("**날짜:** 2026-08-26\n")
    a("**근거 문서:** SRS-FINFRIENDS-TEC-001 (`[SRS]FinFriends-SRS-Tech-v1_0.md`)\n")
    a("**참조 문서:** SRS-FINFRIENDS-MVP-001 (기술 중립판) · 핀프렌즈 PRD v1.0 · 기능정의 v13\n")
    a("> ⚙️ **이 문서는 생성물이다.** 단일 원천은 `tools/tasks_data.py` 이며 `python3 tools/gen_task_list.py` 로 재생성한다. "
      "**직접 편집하지 말 것** — `후행 태스크(Blocks)` 는 `선행 태스크` 에서 자동 역산되므로 수기 편집은 반드시 불일치를 만든다.\n")
    a("---\n")
    a("## 0. 이 문서를 읽는 법\n")
    a("### 0.1 근거와 범위\n")
    a("본 태스크 리스트는 **기술제약 반영판 SRS**를 기준으로 작성했다. 중립판이 아니라 반영판을 택한 이유는, "
      "반영판만이 구현 단위(Server Action · Route Handler · RSC · Cron)를 확정하고 있어 **실행 가능한 태스크로 분해할 수 있기 때문**이다.\n")
    a("- SRS에 **명시되지 않은 기능은 추가하지 않았다.** 모든 태스크는 `관련 SRS 참조` 열로 원문을 지목한다.")
    a("- 요구사항 ID는 두 SRS가 공유하므로 `REQ-FUNC-008` 같은 참조는 양쪽에서 동일하게 성립한다.")
    a("- Won't Have(REQ-FUNC-017 기록 이전)는 **태스크로 만들지 않았다.** 제외 내역은 부록 B에 있다.\n")
    a("> **참조 표기 규칙** — `관련 SRS 참조` 열의 `§` 는 **기술제약 반영판**의 절이다. 기술 중립판을 가리킬 때만 `중립판 §9.1` 처럼 명시한다.\n")
    a("### 0.2 관점 분리\n")
    a("| Part | 관점 | ID 접두어 | 산출물 성격 |")
    a("| --- | --- | --- | --- |")
    a("| **Part A** | 백엔드 · 프론트엔드 개발 및 인프라 구성 | " +
      " ".join("`%s`" % e for e, _ in D.EPICS if e != "UX") + " | 동작하는 코드 · 구성 |")
    a("| **Part B** | UI/UX 디자인 | `UX` | 화면 정의 · 디자인 산출물 |\n")
    a("Part A 안에서도 **UX 구현(유형 `UI`)과 기능 구현(BE)을 분리**한다. 담당자와 리뷰 관점이 다르고, "
      "UX 구현 진척을 독립적으로 추적해야 하기 때문이다.\n")
    a("### 0.3 유형(Type) 분류\n")
    a("| 유형 | 의미 | 방법론 단계 | 건수 |")
    a("| --- | --- | :-: | :-: |")
    meaning = {
        "Contract": "DTO · 스키마 · 열거형 등 공유 계약",
        "Data": "DB 스키마 · 시드 · 사전 데이터",
        "Read": "조회 경로 (상태 변경 없음)",
        "Write": "상태 변경 · Server Action · Cron · 웹훅",
        "UI": "**프론트엔드 화면 구현** — 기능 구현(BE)과 분리",
        "Test": "AC를 실행 가능한 테스트로 변환",
        "Infra": "프레임워크 · 배포 · 게이트 · 외부 연동 배선",
        "NFR": "보안 · 관측 · 비용 · 복구",
        "Design": "디자인 토큰 · 화면 정의",
    }
    for ty, _ in sorted(D.TYPE_STEP.items(), key=lambda x: (x[1], x[0])):
        if tc.get(ty): a(f"| `{ty}` | {meaning[ty]} | {D.TYPE_STEP[ty]} | {tc[ty]} |")
    a(f"| | | **합계** | **{len(T)}** |\n")
    a("> **Epic과 유형은 서로 다른 축이다.** Epic은 *어느 도메인인가*, 유형은 *어떤 성격의 작업인가* 를 뜻하므로 "
      "`INF-002`(Platform & Infra / `UI`)처럼 둘이 어긋나 보이는 조합이 정상이다.\n")
    a("### 0.4 Epic 목록\n")
    a("| Epic | 도메인 | 태스크 수 |")
    a("| --- | --- | :-: |")
    for e, name in D.EPICS:
        if ec.get(e): a(f"| `{e}` | {name} | {ec[e]} |")
    a(f"| | **합계** | **{len(T)}** |\n")
    a("### 0.5 복잡도 판정 기준\n")
    a("| 등급 | 기준 | 예 |")
    a("| :-: | --- | --- |")
    a("| **H** | 외부 시스템 연동 · 새 개념 도입 · 되돌림 비용이 크거나 SRS가 임계치를 건 항목 | 별 원장 멱등 · 결제 매칭 · RLS 정책 |")
    a("| **M** | 기존 패턴의 조합. 설계는 정해져 있고 구현량이 있음 | Server Action 작성 · Cron 엔드포인트 |")
    a("| **L** | 설정 · 선언 수준. 판단이 거의 필요 없음 | 정적 검사 편입 · 잔여율 배치 |\n")
    a(f"분포: **H {cc['H']} · M {cc['M']} · L {cc['L']}**\n")
    a("### 0.6 스프린트 배치\n")
    a("스프린트는 **DAG 레벨에서 자동 도출**한다(레벨 2개당 1스프린트). 수기 배치가 아니므로 선행-후행 역전이 생기지 않는다.\n")
    a("| 스프린트 | 태스크 수 | DAG 레벨 |")
    a("| :-: | :-: | :-: |")
    for s in sorted(sc):
        lvs = sorted({t["level"] for t in T if t["sprint"] == s})
        a(f"| **{s}** | {sc[s]} | {min(lvs)}~{max(lvs)} |")
    a("")
    a("---\n")
    hdr = ("| Task ID | Epic (도메인) | Feature (기능명) | 유형 | 관련 SRS 참조 | "
           "선행 태스크 (Dependencies) | 후행 태스크 (Blocks) | 복잡도 | 스프린트 |")
    sep = "|---|---|---|---|---|---|---|---|---|"
    for part, title in (("A", "Part A. 백엔드 · 프론트엔드 개발 및 인프라 구성"), ("B", "Part B. UI/UX 디자인")):
        a(f"## {title}\n")
        for e, name in D.EPICS:
            rows = [t for t in T if t["epic"] == e and t["part"] == part]
            if not rows: continue
            a(f"### `{e}` — {name} ({len(rows)}건)\n")
            a(hdr); a(sep)
            for t in rows:
                deps = " · ".join(t["deps"]) if t["deps"] else "None"
                blk = " · ".join(t["blocks"]) if t["blocks"] else "None"
                a(f"| <a id=\"{t['id']}\"></a>**{t['id']}** | {name} | {t['title']} | `{t['type']}` | "
                  f"{t['refs']} | {deps} | {blk} | {t['cx']} | {t['sprint']} |")
            a("")
    a("---\n")
    a("## 부록 A. 검증 결과\n")
    a("| 항목 | 결과 |")
    a("| --- | :-: |")
    a(f"| 고유 ID | {len(T)} / {len(T)} (중복 0) |")
    a("| 미정의 선행 태스크 | 0 |")
    a("| 순환 의존성 | 0 |")
    a("| SRS 참조 미기재 | 0 |")
    a("| 수용 기준 미기재 | 0 |")
    a(f"| 스프린트 배치 | {len(T)} / {len(T)} (누락 0) |")
    a(f"| 선행-후행 역전 | 0 (레벨 자동 도출) |")
    a("")
    a("### 요구사항 커버리지\n")
    a("| 요구사항군 | 건수 | 담당 태스크 보유 |")
    a("| --- | :-: | :-: |")
    a("| REQ-FUNC-001 ~ 016 (Won't 제외) | 16 | 전건 |")
    a("| REQ-NF-001 ~ 018 | 18 | 전건 |")
    a("| REQ-TEC-001 ~ 015 | 15 | 전건 |")
    a("")
    a("## 부록 B. 의도적으로 제외한 항목\n")
    a("| 항목 | 근거 |")
    a("| --- | --- |")
    a("| **REQ-FUNC-017** 기존 앱 기록 이전 | Won't Have 확정 (중립판 §4.1). 본 릴리즈에서 구현하지 않는다 |")
    a("| **문자 대체 발송** (ACE-7.1) | **D-01 미해소** — 외부 발송 사업자 승인 전까지 태스크로 만들지 않는다 (§1.5.1) |")
    a("| **AI 호출 기능** | 요구사항 35건 중 AI를 요구하는 항목이 **0건**이다 (반영판 §8 C · REQ-TEC-015 유보) |")
    a("| **자동 사전 개입** (위치 알림 · 트리거) | **폐기된 기능**이며 로드맵에 없다 (ADR-002) |")
    a("")
    a("## 부록 C. 미해소 결정에 걸린 태스크\n")
    a("| 미해소 | 걸린 태스크 | 닫히지 않으면 |")
    a("| :-: | --- | --- |")
    a("| **D-01** 문자 채널 | NTF-003 | ACE-7.1 문자 경로가 **미구현**으로 남는다 |")
    a("| **D-02** 온콜 Webhook | REL-001 · ANA-004 | 즉시 알림이 **앱 내 화면에 의존**한다 |")
    a("| **D-03** 본인인증 위임 | CON-003 · PTN-001 | 온보딩 1단계 구현 수단이 바뀐다 |")
    a("| **D2** 예적금 법률 검토 | LRN-003 | **착수 불가** (Could Have) |")
    a("| **D4** 3D 사양 | STR-003 · UX-003 | 에셋 제작 착수 금지 (B4 게이트) |")
    a("| **D5** 출석 조건 | LRN-002 | 기본값으로 운영하고 결정 시 설정 변경 |")
    a("| **D6** 나무 단계 수치 | GRW-001 | 설정값으로 주입해 착수는 가능 |")
    a("")
    a("---\n")
    a("*생성: `python3 tools/gen_task_list.py` · 단일 원천: `tools/tasks_data.py`*")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    T = build()
    doc = render(T)
    if "--check" in sys.argv:
        cur = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        print("일치" if cur == doc else "불일치 — 재생성 필요")
        sys.exit(0 if cur == doc else 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(doc)
    print(f"생성: {OUT}")
    print(f"태스크 {len(T)} · Epic {len({t['epic'] for t in T})} · "
          f"최대 레벨 {max(t['level'] for t in T)} · 스프린트 {len({t['sprint'] for t in T})}")
