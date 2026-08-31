#!/usr/bin/env python3
"""프로토타입 상태 문구 대조 — 명세 §3.2 ↔ `app/src/mocks/fixtures.ts`.

명세가 상태 문구를 **확정 전문**으로 못 박아 뒀다(T3). 화면 컴포넌트가 문구를 직접
들고 있으면 목이 `src/mocks/` 밖으로 새고, 교체 지점이 흐려진다(스킬 401).

이 검사기는 명세의 표를 직접 파싱한다. 명세를 고치면 자동으로 따라온다.
`N원` 같은 자리표시자가 든 조각은 자리표시자를 기준으로 쪼개 양쪽 조각만 본다.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs" / "plan-docs" / "[Spec]Prototype-Visual-Plan.md"
APP = ROOT / "app" / "src" / "app"
SECTION = re.compile(r"### 3\.2 확정 문구.*?\n(\|.*?)\n\n", re.S)
PLACEHOLDER = re.compile(r"N원|「[^」]*」")   # 금액·토픽 자리표시자


def phrases_from_spec(text):
    """§3.2 표의 마지막 열에서 문구 조각을 뽑는다."""
    m = SECTION.search(text)
    if not m:
        return None
    out = []
    for line in m.group(1).splitlines():
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 3 or cells[0].startswith((":", "-")) or cells[0] == "화면":
            continue
        label = f"{cells[0]}·{cells[1]}"
        raw = cells[2].replace("**", "").replace("→", "/")
        for seg in raw.split("/"):
            seg = seg.strip().strip("*").strip()
            # 자리표시자(N원 · 「토픽」)가 든 조각은 앞뒤로 쪼개 리터럴만 본다.
            # 명세는 한 칸에 두 문장을 붙여 쓰기도 하므로 문장 단위로 더 쪼갠다.
            for part in PLACEHOLDER.split(seg):
                for sentence in re.split(r"(?<=다)\.\s+|(?<=요)\.\s+", part):
                    sentence = sentence.strip().rstrip(".").strip()
                    if len(sentence) >= 5:
                        out.append((label, sentence))
    return out


def main():
    if not SPEC.exists() or not APP.exists():
        print("명세 또는 앱 디렉터리가 없다")
        return 1

    items = phrases_from_spec(SPEC.read_text())
    if items is None:
        print("명세에서 `### 3.2 상태 문구` 표를 찾지 못했다")
        return 1

    src = "\n".join(f.read_text() for f in sorted(APP.rglob("*.fixture.ts")))
    missing = [(k, p) for k, p in items if p not in src]

    print(f"명세 §3.2 확정 문구 {len(items)}조각 대조")
    if missing:
        print(f"  ❌ fixture 에 없는 문구 {len(missing)}건 — 화면 컴포넌트에 박혀 있지 않은지 본다")
        for k, p in missing:
            print(f"     {k}  「{p}」")
        print("실패")
        return 1

    print("  ✅ 전건 일치 — 확정 문구가 전부 *.fixture.ts 안에 있다")
    print("전부 통과")
    return 0


if __name__ == "__main__":
    sys.exit(main())
