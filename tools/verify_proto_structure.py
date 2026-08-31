#!/usr/bin/env python3
"""프로토타입 구조 검사 — 라우트 · 목 경계 · 모드.

세 가지를 본다.
  1. `page.tsx` 수가 명세 §1의 라우트 수와 같은가
  2. `*.fixture.ts` 마다 첫 줄에 `PROTO-DATA:` 마커가 있는가
     — 후행 태스크가 grep 한 번으로 교체 지점을 전수 특정한다. 하나라도 빠지면 그 등식이 깨진다
  3. 목이 화면 옆에만 사는가 — `src/mocks/` 같은 최상위 디렉터리를 만들지 않는다
  4. 두 모드가 같은 토큰 이름 집합을 갖는가 — 한쪽에만 있는 토큰은 그 모드에서만 깨진다
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app" / "src" / "app"
CSS = ROOT / "app" / "src" / "app" / "globals.css"
EXPECTED_ROUTES = 15  # 라우트 14건 + 프로토타입 색인 1건


def block(css, mode):
    m = re.search(rf'\[data-mode="{mode}"\]\s*\{{(.*?)\n\}}', css, re.S)
    return set(re.findall(r"(--ff-[a-z0-9-]+)\s*:", m.group(1))) if m else set()


def main():
    ok = True

    pages = sorted(APP.rglob("page.tsx"))
    print(f"라우트 {len(pages)}건 (색인 포함)")
    if len(pages) != EXPECTED_ROUTES:
        ok = False
        print(f"  ❌ {EXPECTED_ROUTES}건이어야 한다")
    else:
        print("  ✅ 기대값과 일치")

    fixtures = sorted(APP.rglob("*.fixture.ts"))
    missing = [f for f in fixtures if "PROTO-DATA:" not in f.read_text().splitlines()[0]]
    print(f"fixture {len(fixtures)}건 · PROTO-DATA 마커 {len(fixtures) - len(missing)}건")
    if missing:
        ok = False
        for f in missing:
            print(f"  ❌ 첫 줄에 마커가 없다 — {f.relative_to(ROOT)}")
    else:
        print("  ✅ 전건 일치")

    stray = [d for d in ("mocks", "fixtures") if (ROOT / "app" / "src" / d).exists()]
    if stray:
        ok = False
        print(f"  ❌ 목이 화면 밖에 있다 — app/src/{{{','.join(stray)}}}")
    else:
        print("  ✅ 목이 화면 옆에만 있다")

    css = CSS.read_text()
    fun, clean = block(css, "fun"), block(css, "clean")
    only_fun, only_clean = sorted(fun - clean), sorted(clean - fun)
    print(f"모드 토큰 — fun {len(fun)}종 · clean {len(clean)}종")
    if only_fun or only_clean:
        ok = False
        if only_fun:
            print(f"  ❌ fun 에만 있다 — {' '.join(only_fun)}")
        if only_clean:
            print(f"  ❌ clean 에만 있다 — {' '.join(only_clean)}")
    else:
        print("  ✅ 두 모드가 같은 토큰 이름 집합을 갖는다")

    print("전부 통과" if ok else "실패")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
