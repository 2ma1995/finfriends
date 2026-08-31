#!/bin/zsh
# 프로토타입 상태 스크린샷 촬영 — 명세 §7.3
#
# 쓰는 법:
#   cd app && npm run build && npx next start -p 4312 &
#   tools/shoot_proto.sh
#
# 왜 개발 서버가 아니라 프로덕션 서버인가 —
#   next dev 의 HMR 웹소켓이 열려 있으면 헤드리스 크롬의 --virtual-time-budget 이
#   만료되지 않아 프로세스가 끝나지 않는다. 빌드 후 next start 로 띄운다.
set -e

ROOT="${0:a:h:h}"
OUT="$ROOT/reports/proto"
TMP="${TMPDIR:-/tmp}/ff-shoot.$$"
PORT="${PORT:-4312}"
CH="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

[[ -x "$CH" ]] || { echo "크롬을 찾지 못했다: $CH  (CHROME=... 로 지정)"; exit 1 }
curl -sf -o /dev/null "http://localhost:$PORT/" || { echo "서버가 없다: localhost:$PORT"; exit 1 }

mkdir -p "$OUT" "$TMP"
trap 'rm -rf "$TMP"' EXIT

# shoot <파일명> <경로> <폭>
shoot() {
  local png="$OUT/$1.png" url="http://localhost:$PORT$2" prof="$TMP/$1"
  rm -f "$png"
  "$CH" --headless --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
        --user-data-dir="$prof" --virtual-time-budget=2500 --force-device-scale-factor=2 \
        --window-size=$3,1600 --screenshot="$png" "$url" >/dev/null 2>&1 &
  local pid=$!
  for i in $(seq 1 30); do sleep 1; [[ -s "$png" ]] && break; done
  sleep 1; kill $pid 2>/dev/null || true; wait $pid 2>/dev/null || true
  printf '  %s\n' "$1.png"
}

echo "라우트 13건 + 색인 + 변형 2장"
shoot index            /                        1100
shoot consent          /consent                  452
shoot parent-onboarding /parent/onboarding       452
shoot parent-tree      /parent/tree              452
shoot parent-forest    /parent/forest            452
shoot parent-missions  /parent/missions          452
shoot parent-spending  /parent/spending          452
shoot child-home       /child/home               452
shoot child-home-back  '/child/home?face=back'    452
shoot child-learn      /child/learn              452
shoot child-quiz       /child/quiz/spend         452
shoot child-plan-new   /child/plan/new           452
shoot child-retro-met  /child/retro/r-201        452
shoot child-retro-over /child/retro/r-202        452
shoot child-wishlist   /child/wishlist           452
shoot child-stars      /child/stars              452

echo "하단 여백 정리"
python3 "$ROOT/tools/trim_shots.py" "$OUT"
