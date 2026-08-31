"""겹침 검증 — 아이템을 다른 아이템 위로 끌었을 때 **파고들지 않고 얹히는가**.

먼저 화면을 훑어 집히는 아이템의 좌표를 찾고, 그중 둘을 골라 하나를 다른 하나 위로 끈다.
`localStorage` 의 `y` 가 0 보다 커져야 통과다.

    cd app && npm run build && npx next start -p 4312 &
    python3 tools/verify_room_stack.py /tmp/prof /tmp/stack.png

훑는 단계가 필요한 이유 — 아이템 좌표를 화면 좌표로 미리 알 수 없다.
카메라·방 회전·아이템 크기가 다 물려 있어서, 클릭해 보고 무엇이 집혔는지 문구로 읽는 게 확실하다.
"""
import asyncio, json, subprocess, sys, time, urllib.request, base64, shutil
import websockets
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROF = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ff-stack-prof"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/ff-stack.png"
URL = "http://localhost:4312/child/home?edit=1&turn=0"
shutil.rmtree(PROF, ignore_errors=True)
proc = subprocess.Popen([CH,"--headless","--use-gl=angle","--use-angle=swiftshader",
  "--enable-unsafe-swiftshader","--hide-scrollbars","--no-first-run",
  "--remote-debugging-port=9335",f"--user-data-dir={PROF}","--window-size=452,880",URL],
  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def targets():
    for _ in range(40):
        try: return json.load(urllib.request.urlopen("http://127.0.0.1:9335/json"))
        except Exception: time.sleep(0.5)
    raise SystemExit("CDP 실패")
async def main():
    ws_url=[t for t in targets() if t["type"]=="page"][0]["webSocketDebuggerUrl"]
    async with websockets.connect(ws_url,max_size=40*1024*1024) as ws:
        i=[0]
        async def cmd(m,p=None):
            i[0]+=1; await ws.send(json.dumps({"id":i[0],"method":m,"params":p or {}}))
            while True:
                r=json.loads(await ws.recv())
                if r.get("id")==i[0]: return r.get("result",{})
        await cmd("Runtime.enable"); await asyncio.sleep(11)
        async def ev(js):
            r=await cmd("Runtime.evaluate",{"expression":js,"returnByValue":True}); return r.get("result",{}).get("value")
        rect=await ev("(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})()")
        X=lambda f: rect["x"]+rect["w"]*f; Y=lambda f: rect["y"]+rect["h"]*f
        async def ptr(t,x,y):
            await cmd("Input.dispatchMouseEvent",{"type":t,"x":x,"y":y,"button":"left",
              "buttons":1 if t!="mouseReleased" else 0,"clickCount":1,"pointerType":"mouse"})
        async def click(fx,fy):
            await ptr("mousePressed",X(fx),Y(fy)); await asyncio.sleep(0.12); await ptr("mouseReleased",X(fx),Y(fy)); await asyncio.sleep(0.35)
            return await ev("document.body.innerText.match(/「(.+?)」를 골랐어요/)?.[1] ?? null")
        found={}
        for fy in (0.42,0.52,0.62,0.72,0.82):
            for fx in (0.18,0.3,0.42,0.54,0.66,0.78):
                n=await click(fx,fy)
                if n and n not in found: found[n]=(fx,fy)
        print("  집히는 아이템:", ", ".join(f"{k}({v[0]:.2f},{v[1]:.2f})" for k,v in found.items()) or "없음")
        if len(found)<2:
            print("판정: ❌ 집을 게 부족"); return
        names=list(found)
        src="고양이" if "고양이" in names else names[0]
        dst="침대" if "침대" in names else [n for n in names if n!=src][0]
        (sx,sy),(dx,dy)=found[src],found[dst]
        print(f"  「{src}」 를 「{dst}」 위로 끈다")
        await ptr("mousePressed",X(sx),Y(sy)); await asyncio.sleep(0.25)
        for k in range(1,13):
            await ptr("mouseMoved",X(sx)+(X(dx)-X(sx))*k/12, Y(sy)+(Y(dy)-Y(sy))*k/12); await asyncio.sleep(0.05)
        await ptr("mouseReleased",X(dx),Y(dy)); await asyncio.sleep(1.0)
        lay=json.loads(await ev("localStorage.getItem('ff-proto-room-layout')") or "{}")
        for k,v in lay.items(): print(f"     {k:<12} x={v['x']:>6} z={v['z']:>6} y={v.get('y',0):>6}")
        stacked=[k for k,v in lay.items() if (v.get('y') or 0)>0.05]
        print("  얹힌 것:", stacked or "없음")
        print("  얹힌 높이:", {k: lay[k].get("y") for k in stacked})
        if not stacked:
            print("판정: ❌ 여전히 겹친다"); return
        deep = lay[[k for k in stacked][0]].get("y")

        # 2) 가장자리로 조금 밀어 본다 — 실제 면을 짚으면 높이가 달라져야 한다.
        #    발자국 겹침으로 재던 방식은 어디에 걸치든 **같은 높이**로 띄웠다.
        await ptr("mousePressed",X(dx),Y(dy)); await asyncio.sleep(0.25)
        for k in range(1,9):
            await ptr("mouseMoved", X(dx)+ (X(dx-0.16)-X(dx))*k/8, Y(dy)+(Y(dy+0.10)-Y(dy))*k/8)
            await asyncio.sleep(0.05)
        await ptr("mouseReleased",X(dx-0.16),Y(dy+0.10)); await asyncio.sleep(1.0)
        lay2=json.loads(await ev("localStorage.getItem('ff-proto-room-layout')") or "{}")
        edge = {k: lay2[k].get("y") for k in lay2 if (lay2[k].get("y") or 0) > 0.001}
        print("  가장자리로 민 뒤:", edge or "전부 바닥")

        shot=await cmd("Page.captureScreenshot",{"format":"png"}); open(OUT,"wb").write(base64.b64decode(shot["data"]))
        moved = (not edge) or any(abs((v or 0) - deep) > 0.01 for v in edge.values())
        print("판정:", "✅ 실제 면을 짚는다 — 자리에 따라 높이가 달라진다" if moved
              else "❌ 어디에 놓아도 같은 높이다 (발자국 겹침 방식)")
        globals()["EXIT"] = 0 if moved else 1
EXIT = 1
try:
    asyncio.run(main())
finally:
    proc.terminate()
sys.exit(EXIT)
