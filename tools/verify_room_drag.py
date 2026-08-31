"""방 꾸미기 드래그 검증 — CDP 로 **진짜 포인터 이벤트**를 넣는다.

스크린샷으로는 「끌어서 옮기기」가 되는지 알 수 없다. 헤드리스는 클릭을 못 하고,
`?edit=1` 로 화면을 열어 봐야 버튼이 보이는 것까지만 확인된다.
그래서 크롬을 디버깅 포트로 띄우고 Input.dispatchMouseEvent 로 실제 드래그를 넣는다.

    cd app && npm run build && npx next start -p 4312 &
    python3 tools/verify_room_drag.py /tmp/prof /tmp/drag.png

판정 조건 — 아이템이 **선택되고**, localStorage 의 배치값이 **바뀌어야** 통과다.
"""
import asyncio, json, subprocess, sys, time, urllib.request, base64, shutil, os
import websockets

CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROF = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ff-drag-prof"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/ff-drag.png"
URL = "http://localhost:4312/child/home?edit=1&turn=8"
shutil.rmtree(PROF, ignore_errors=True)

proc = subprocess.Popen([CH, "--headless", "--use-gl=angle", "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader", "--hide-scrollbars", "--no-first-run",
    "--remote-debugging-port=9333", f"--user-data-dir={PROF}",
    "--window-size=452,880", URL], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def targets():
    for _ in range(40):
        try:
            return json.load(urllib.request.urlopen("http://127.0.0.1:9333/json"))
        except Exception:
            time.sleep(0.5)
    raise SystemExit("CDP 연결 실패")

async def main():
    pages = [t for t in targets() if t["type"] == "page"]
    ws_url = pages[0]["webSocketDebuggerUrl"]
    async with websockets.connect(ws_url, max_size=40*1024*1024) as ws:
        i = [0]
        async def cmd(method, params=None):
            i[0] += 1
            await ws.send(json.dumps({"id": i[0], "method": method, "params": params or {}}))
            while True:
                m = json.loads(await ws.recv())
                if m.get("id") == i[0]:
                    return m.get("result", {})

        await cmd("Runtime.enable")
        await asyncio.sleep(9)          # GLB 로딩 · 첫 렌더

        async def ev(js):
            r = await cmd("Runtime.evaluate", {"expression": js, "returnByValue": True})
            return r.get("result", {}).get("value")

        rect = await ev("(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()")
        if not rect:
            print("❌ canvas 없음"); return
        print(f"  canvas {rect['w']:.0f}x{rect['h']:.0f} @ ({rect['x']:.0f},{rect['y']:.0f})")

        before = await ev("localStorage.getItem('ff-proto-room-layout')")
        print("  드래그 전 저장값:", before)

        async def pointer(t, x, y):
            await cmd("Input.dispatchMouseEvent", {
                "type": t, "x": x, "y": y, "button": "left",
                "buttons": 1 if t != "mouseReleased" else 0,
                "clickCount": 1, "pointerType": "mouse"})

        # 고양이 근처(오른쪽 아래)를 집어 왼쪽 위로 끈다
        cx, cy = rect["x"] + rect["w"] * 0.66, rect["y"] + rect["h"] * 0.72
        tx, ty = rect["x"] + rect["w"] * 0.30, rect["y"] + rect["h"] * 0.58
        await pointer("mousePressed", cx, cy); await asyncio.sleep(0.25)
        for k in range(1, 9):
            await pointer("mouseMoved", cx + (tx-cx)*k/8, cy + (ty-cy)*k/8)
            await asyncio.sleep(0.06)
        await pointer("mouseReleased", tx, ty); await asyncio.sleep(0.8)

        sel = await ev("document.body.innerText.match(/「(.+?)」를 골랐어요/)?.[1] ?? null")
        after = await ev("localStorage.getItem('ff-proto-room-layout')")
        print("  고른 아이템:", sel)
        print("  드래그 후 저장값:", after)

        shot = await cmd("Page.captureScreenshot", {"format": "png"})
        if shot.get("data"):
            open(OUT, "wb").write(base64.b64decode(shot["data"]))
            print("  스크린샷:", OUT)

        ok = sel is not None and after and after != before
        print("판정:", "✅ 드래그로 아이템이 옮겨지고 저장됐다" if ok else "❌ 옮겨지지 않았다")

EXIT = 1
try:
    asyncio.run(main())
finally:
    proc.terminate()
sys.exit(EXIT)
