"""이름표·칩 검증 — 칩을 눌러 고르면 3D 이름표가 강조되는가.

가려진 아이템은 3D 에서 못 집는다. 목록 칩이 그 우회로인데,
칩과 3D 가 같은 선택 상태를 보는지는 눈으로 확인할 수 없다.

    cd app && npm run build && npx next start -p 4312 &
    python3 tools/verify_room_labels.py /tmp/prof /tmp/label.png
"""
import asyncio, json, subprocess, sys, time, urllib.request, base64, shutil
import websockets
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROF = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ff-label-prof"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/ff-label.png"
shutil.rmtree(PROF,ignore_errors=True)
proc=subprocess.Popen([CH,"--headless","--use-gl=angle","--use-angle=swiftshader",
 "--enable-unsafe-swiftshader","--hide-scrollbars","--no-first-run",
 "--remote-debugging-port=9336",f"--user-data-dir={PROF}","--window-size=452,940",
 "http://localhost:4312/child/home?edit=1&turn=6"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def targets():
    for _ in range(40):
        try: return json.load(urllib.request.urlopen("http://127.0.0.1:9336/json"))
        except Exception: time.sleep(0.5)
    raise SystemExit("CDP 실패")
async def main():
    u=[t for t in targets() if t["type"]=="page"][0]["webSocketDebuggerUrl"]
    async with websockets.connect(u,max_size=40*1024*1024) as ws:
        i=[0]
        async def cmd(m,p=None):
            i[0]+=1; await ws.send(json.dumps({"id":i[0],"method":m,"params":p or {}}))
            while True:
                r=json.loads(await ws.recv())
                if r.get("id")==i[0]: return r.get("result",{})
        await cmd("Runtime.enable"); await asyncio.sleep(12)
        async def ev(js):
            r=await cmd("Runtime.evaluate",{"expression":js,"returnByValue":True}); return r.get("result",{}).get("value")
        tags=await ev("[...document.querySelectorAll('[data-id]')].map(d=>d.textContent)")
        chips=await ev("[...document.querySelectorAll('button')].map(b=>b.textContent).filter(t=>['고양이','침대','책상','의자','빨간 꽃'].includes(t))")
        print("  3D 이름표:", tags)
        print("  목록 칩  :", chips)
        # 「책상」 칩을 누른다 — 아바타에 가려 3D 로는 집기 어려운 것
        await ev("[...document.querySelectorAll('button')].find(b=>b.textContent==='책상')?.click()")
        await asyncio.sleep(0.7)
        picked=await ev("document.body.innerText.match(/「(.+?)」를 골랐어요/)?.[1] ?? null")
        hl=await ev("(()=>{const d=[...document.querySelectorAll('[data-id]')].find(x=>x.textContent==='책상');return d?d.style.background:null;})()")
        shot=await cmd("Page.captureScreenshot",{"format":"png"}); open(OUT,"wb").write(base64.b64decode(shot["data"]))
        print("  칩으로 고른 것:", picked)
        print("  이름표 배경  :", hl)
        ok = picked=="책상" and hl and "79" in hl.replace(" ","")  # rgb(79,122,74)
        print("판정:", "✅ 칩으로 고르면 3D 이름표가 강조된다" if ok else "❌ 강조되지 않는다")
        globals()["EXIT"]=0 if ok else 1
EXIT=1
try: asyncio.run(main())
finally: proc.terminate()
sys.exit(EXIT)
