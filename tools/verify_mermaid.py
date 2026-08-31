# -*- coding: utf-8 -*-
"""문서의 mermaid 다이어그램을 브라우저 파서로 검증할 페이지를 만든다.

  python3 tools/verify_mermaid.py     # /tmp 에 검사 페이지 생성 · 경로 출력
브라우저로 열면 각 다이어그램의 파싱 결과가 표로 나오고, 실패가 있으면 붉게 표시된다.
"""
import os, re, glob, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "_mermaid_check.html")

def collect():
    items = []
    for p in [q for q in sorted(glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True))
              if os.sep + "tasks" + os.sep not in q] + sorted(glob.glob(os.path.join(ROOT, "*.md"))):
        s = open(p, encoding="utf-8").read()
        for i, m in enumerate(re.finditer(r'```mermaid\n(.*?)\n```', s, re.S), 1):
            items.append({"doc": os.path.basename(p), "idx": i, "src": m.group(1)})
    return items

HTML = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>mermaid 검증</title>
<style>
body{font-family:ui-monospace,Menlo,monospace;margin:24px;background:#111;color:#ddd}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #333;padding:6px 10px;text-align:left}
th{background:#1c1c1c}
.ok{color:#6fbf97}.ng{color:#e8867f;font-weight:700}
#sum{font-size:18px;margin:16px 0;padding:12px;border:1px solid #333;background:#1a1a1a}
pre{white-space:pre-wrap;color:#e8867f;font-size:12px;margin:4px 0 0}
</style></head><body>
<h1>mermaid 다이어그램 검증</h1>
<div id="sum">검사 중…</div>
<table id="t"><thead><tr><th>#</th><th>문서</th><th>종류</th><th>결과</th></tr></thead><tbody></tbody></table>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
const ITEMS = __ITEMS__;
mermaid.initialize({startOnLoad:false, securityLevel:'loose'});
(async () => {
  const tb = document.querySelector('#t tbody');
  let ok = 0, ng = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    const kind = (it.src.trim().split(/\\s+/)[0] || '?');
    let res = '', cls = 'ok';
    try { await mermaid.parse(it.src); res = 'PASS'; ok++; }
    catch (e) { res = 'FAIL: ' + (e && e.message ? e.message : e); cls = 'ng'; ng++; }
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${it.doc}</td><td>${kind}</td>` +
      `<td class="${cls}">${res.startsWith('FAIL') ? '<b>FAIL</b><pre>'+res.slice(6)+'</pre>' : 'PASS'}</td>`;
    tb.appendChild(tr);
  }
  document.getElementById('sum').innerHTML =
    `<span class="${ng?'ng':'ok'}">총 ${ITEMS.length}개 · PASS ${ok} · FAIL ${ng}</span>`;
  window.__RESULT__ = {total: ITEMS.length, pass: ok, fail: ng};
})();
</script></body></html>"""

if __name__ == "__main__":
    items = collect()
    open(OUT, "w", encoding="utf-8").write(HTML.replace("__ITEMS__", json.dumps(items, ensure_ascii=False)))
    print(f"생성: {OUT}")
    print(f"다이어그램 {len(items)}개")
    for doc in sorted({i['doc'] for i in items}):
        print(f"  {sum(1 for i in items if i['doc']==doc):>3}개  {doc}")
