# -*- coding: utf-8 -*-
"""저장소 내부 경로 참조 검사.

문서가 가리키는 저장소 내 파일이 실제로 존재하는지 확인한다.
디렉터리를 재배치하면 반드시 구 경로가 남으므로, 이동 뒤에는 이 검사를 돌린다.

  python3 tools/verify_links.py
"""
import os, re, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 스캔에서 빼는 디렉터리 — 생성물과 의존성. app/ 자체는 링크 대상이라 남긴다
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".next"}

# 코드 스팬·링크에 등장하는 저장소 내부 경로
PAT = re.compile(r'[`(]/?((?:docs|tools|archive|\.github)/[^`)\s]+?\.(?:md|py|html|json))[`)]')
# 문서 이름만 적힌 경우도 잡는다
NAME = re.compile(r'`/?((?:[A-Za-z\-]+/)*\[[A-Za-z]+\][A-Za-z0-9\-_.]+\.md)`')


def scan():
    files = [p for p in glob.glob(os.path.join(ROOT, "**", "*.md"), recursive=True)
             if ".git/" not in p and not any(f"/{d}/" in p for d in SKIP_DIRS)] + \
            [p for p in glob.glob(os.path.join(ROOT, "tools", "*.py"))]
    # glob 은 숨김 디렉터리(.github)를 건너뛰므로 os.walk 로 훑는다
    known = set()
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for n in names:
            known.add(os.path.relpath(os.path.join(base, n), ROOT))
    basenames = {os.path.basename(k) for k in known}
    bad = []
    checked = 0
    for p in files:
        rel = os.path.relpath(p, ROOT)
        s = open(p, encoding="utf-8").read()
        for m in PAT.finditer(s):
            target = m.group(1)
            # 와일드카드(*) · 자리표시자(<TASK-ID>) · 브레이스 확장({A,B})은 실제 경로가 아니다
            if any(c in target for c in "*<{"):
                continue
            checked += 1
            if target not in known:
                bad.append((rel, target))
        for m in NAME.finditer(s):
            target = m.group(1)
            checked += 1
            # 디렉터리가 붙은 표기는 실제 경로로, 이름만 있으면 파일명으로 확인한다
            if "/" in target:
                if target not in known: bad.append((rel, target))
            elif target not in basenames:
                bad.append((rel, target))
    return checked, bad


if __name__ == "__main__":
    checked, bad = scan()
    print(f"경로 참조 {checked}건 검사")
    if bad:
        seen = set()
        for src, t in bad:
            key = (src, t)
            if key in seen: continue
            seen.add(key)
            print(f"  ❌ {src} → {t}")
        print(f"\n깨진 참조 {len(seen)}종")
        sys.exit(1)
    print("깨진 참조 0건")
