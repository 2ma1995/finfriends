#!/usr/bin/env python3
"""디자인 토큰 검사 — INF-002 AC1 · UX-001.

두 가지를 본다.
  1. `.tsx` 안에 `#RRGGBB` 색상 리터럴이 남아 있는가
  2. `var(--ff-*)` 로 참조하는 토큰이 `globals.css` 에 실제로 정의돼 있는가

2번이 필요한 이유 — 리터럴을 토큰으로 바꾸다 정의를 빠뜨리면 `.tsx` 는 깨끗해 보이는데
브라우저는 선언 전체를 버린다. 배경이 사라지고 글자색이 상속돼도 리터럴 수는 0이다.
2026-08-27 실제로 이 방식으로 별 카드 그러데이션이 사라졌다.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / "app" / "src" / "app" / "globals.css"
SRC = ROOT / "app" / "src"
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")


def main():
    if not CSS.exists():
        print(f"토큰 파일이 없다: {CSS.relative_to(ROOT)}")
        return 1

    css = CSS.read_text()
    defined = set(re.findall(r"(--ff-[a-z0-9-]+)\s*:", css))

    # globals.css 안에서 쓰는 토큰(html/body · .ff-serif)도 사용으로 친다
    literals, used = [], set(re.findall(r"var\((--ff-[a-z0-9-]+)\)", css))
    for path in sorted(SRC.rglob("*.tsx")):
        text = path.read_text()
        used |= set(re.findall(r"var\((--ff-[a-z0-9-]+)\)", text))
        for i, line in enumerate(text.splitlines(), 1):
            for m in HEX.finditer(line):
                literals.append(f"{path.relative_to(ROOT)}:{i}  {m.group(0)}")

    missing = sorted(used - defined)

    print(f"토큰 정의 {len(defined)}종 · 참조 {len(used)}종")
    ok = True
    if literals:
        ok = False
        print(f"  ❌ 색상 리터럴 {len(literals)}건")
        for x in literals[:20]:
            print(f"     {x}")
    else:
        print("  ✅ 색상 리터럴 0건")

    if missing:
        ok = False
        print(f"  ❌ 정의되지 않은 토큰 {len(missing)}종 — {' '.join(missing)}")
    else:
        print("  ✅ 정의되지 않은 토큰 0종")

    unused = sorted(defined - used)
    if unused:
        print(f"  · 어디에서도 쓰지 않는 토큰 {len(unused)}종 (경고 아님) — {' '.join(unused)}")

    print("전부 통과" if ok else "실패")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
