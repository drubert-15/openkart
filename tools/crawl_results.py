"""Savāc visu gadu rezultātu un kalendāra lapas no openkart.lv (datubāzei).

Lieto: python3 tools/crawl_results.py <kešatmiņas mape>
"""
import re, sys, json, os
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from crawl import get, content, CACHE  # izmanto to pašu kešatmiņu un lejupielādi

def opts(html, sel):
    c = content(html)
    return [o["value"] for o in c.select(sel + " option") if o.get("value")] if c else []

done = []
years = opts(get("/lv/results/2026/cempionats"), "#year")
for y in years:
    get(f"/lv/races/year/{y}")
    first = get(f"/lv/results/{y}")
    if not first: continue
    cats = opts(first, "#championship")
    for c in cats:
        h = get(f"/lv/results/{y}/{c}")
        if not h: continue
        gps = opts(h, "#gp")
        with ThreadPoolExecutor(3) as ex:  # 3 vienlaicīgi pieprasījumi
            list(ex.map(get, [f"/lv/results/{y}/{c}/{g}" for g in gps]))
        done.append([y, c, gps])
    print(y, len(cats), "ieskaites", sum(len(d[2]) for d in done if d[0] == y), "posmi", flush=True)
json.dump(done, open(os.path.join(CACHE, "_results_index.json"), "w"))
print("done", len(done))
