#!/usr/bin/env python3
"""스크린샷 하단 여백 정리 — tools/shoot_proto.sh 가 호출한다.

헤드리스 크롬의 --screenshot 은 뷰포트 크기 그대로 찍는다. 화면마다 높이가
다르므로 넉넉히 찍은 뒤 배경색으로만 채워진 아래쪽 행을 잘라낸다.
"""
import pathlib
import sys

from PIL import Image

# 배경으로 치는 색 — 모드마다 캔버스 색이 다르고, 프레임 바깥은 body 색이다.
# 하나라도 빠지면 그 줄이 「내용 있음」으로 잡혀 여백이 안 잘린다.
BG = (
    (236, 232, 225),  # body — 모드 밖 영역
    (250, 247, 241),  # --ff-canvas (clean)
    (255, 249, 240),  # --ff-canvas (fun)
    (255, 255, 255),  # --ff-surface — 카드가 끝까지 깔린 화면 대비
)
PAD = 32              # 2배 스케일 기준 = CSS 16px
TOL = 4               # JPEG 아닌 PNG라 오차는 거의 없지만 여유를 둔다


def is_background(row):
    return all(
        any(
            abs(px[0] - b[0]) <= TOL and abs(px[1] - b[1]) <= TOL and abs(px[2] - b[2]) <= TOL
            for b in BG
        )
        for px in row
    )


def main(target):
    files = sorted(pathlib.Path(target).glob("*.png"))
    if not files:
        print(f"png 이 없다: {target}")
        return 1
    for path in files:
        im = Image.open(path).convert("RGB")
        w, h = im.size
        px = im.load()
        bottom = h
        for y in range(h - 1, -1, -1):
            if not is_background([px[x, y] for x in range(0, w, 4)]):
                bottom = min(h, y + 1 + PAD)
                break
        if bottom < h:
            im.crop((0, 0, w, bottom)).save(path)
        print(f"  {path.name:<22} {h} → {bottom}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "reports/proto"))
