#!/usr/bin/env python3
"""`/goal` 프롬프트 본문 분리 — 규범 원본에서 실행 기록을 만든다.

원본(`docs/ops-docs/[Ops]Goal-*.md`)의 `## 프롬프트` 아래 ```markdown 펜스 안쪽만
꺼내 `docs/ops-docs/goal-runs/<YYYY-MM-DDTHHMM>-<슬러그>.md` 로 저장한다.

손으로 자르면 원본과 어긋난다. 규범을 고쳤으면 이 스크립트를 다시 돌린다.

    python3 tools/split_goal_prompt.py "docs/ops-docs/[Ops]Goal-Prototype-Local-Visual.md" proto-local-visual
"""
import datetime
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FENCE = re.compile(r"^## 프롬프트\s*\n+```markdown\n(.*?)\n```", re.S | re.M)


def main(src_rel, slug, stamp=None):
    src = ROOT / src_rel
    if not src.exists():
        print(f"원본이 없다: {src_rel}")
        return 1

    m = FENCE.search(src.read_text())
    if not m:
        print("`## 프롬프트` 아래 ```markdown 펜스를 찾지 못했다")
        return 1
    body = m.group(1).rstrip()

    now = datetime.datetime.now()
    stamp = stamp or now.strftime("%Y-%m-%dT%H%M")
    doc_id = re.search(r"\*\*문서 ID:\*\*\s*(\S+)", src.read_text())
    ver = re.search(r"\*\*개정 버전:\*\*\s*(\S+)", src.read_text())

    out = ROOT / "docs" / "ops-docs" / "goal-runs" / f"{stamp}-{slug}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    header = (
        "<!--\n"
        f"실행 파일 — {doc_id.group(1) if doc_id else '?'} "
        f"v{ver.group(1) if ver else '?'} 의 프롬프트 본문만 분리한 것.\n"
        f"원본: {src_rel}\n"
        f"실행 시각: {stamp[:10]} {stamp[11:13]}:{stamp[13:]} (KST)\n"
        "이 파일은 실행 기록이다. 규범을 고치려면 원본을 고치고 다시 분리한다.\n"
        "-->\n\n"
    )
    out.write_text(header + body + "\n")
    print(f"{out.relative_to(ROOT)}  ({len(body.splitlines())}줄)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None))
