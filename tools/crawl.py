"""Savāc openkart.lv lapas, no kurām tiek būvēta jaunā vietne.

Lieto: python3 tools/crawl.py <kešatmiņas mape>
Lapas tiek glabātas kešatmiņā, tāpēc atkārtota palaišana tās vairs nelejupielādē.
"""
import os, re, sys, time, json, urllib.request
from bs4 import BeautifulSoup

BASE = "https://openkart.lv"
YEAR = "2026"
CACHE = sys.argv[1]
os.makedirs(CACHE, exist_ok=True)


def key(path):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", path.strip("/")) + ".html"


def get(path):
    f = os.path.join(CACHE, key(path))
    if os.path.exists(f):
        return open(f, encoding="utf-8").read()
    for attempt in range(4):
        try:
            req = urllib.request.Request(BASE + path, headers={"User-Agent": "openkart-redesign-builder"})
            html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8")
            break
        except Exception as e:  # tīkla kļūda: mēģina vēlreiz
            print("  retry", path, e, flush=True)
            time.sleep(2 ** attempt)
    else:
        return None
    open(f, "w", encoding="utf-8").write(html)
    time.sleep(0.4)
    return html


def content(html):
    return BeautifulSoup(html, "html.parser").select_one("#content")


def links(html, pattern):
    c = content(html)
    out = []
    for a in c.find_all("a", href=True):
        h = re.sub(r"^https?://openkart\.lv", "", a["href"]).split("#")[0]
        if re.fullmatch(pattern, h) and h not in out:
            out.append(h)
    return out


def main():
    pages = []
    def add(p):
        if p not in pages:
            pages.append(p)

    # Statiskās lapas
    for p in ["/lv/stats", "/lv/s/2-kontakti", "/lv/s/4-par-openkart", "/lv/s/6-slavas-zale", "/lv/s/7-nolikums", "/lv/races"]:
        get(p); add(p)

    # Rezultāti: visas šī gada ieskaites + čempionāta posmi
    first = get(f"/lv/results/{YEAR}/cempionats")
    add(f"/lv/results/{YEAR}/cempionats")
    soup = content(first)
    cats = [o["value"] for o in soup.select("#championship option") if o.get("value")]
    gps = [o["value"] for o in soup.select("#gp option") if o.get("value")]
    for c in cats:
        p = f"/lv/results/{YEAR}/{c}"; get(p); add(p)
    for g in gps:
        p = f"/lv/results/{YEAR}/cempionats/{g}"
        if get(p): add(p)
    add("/lv/results")

    # Kalendārs: pieteikušos saraksti
    for p in links(get("/lv/races"), r"/lv/races/\d+[^/]*/race_signups"):
        get(p); add(p)

    # Jaunumi: katras kategorijas lapa + tajā minētie raksti
    home = get("/lv")
    news_cats = re.findall(r'href="(?:https://openkart\.lv)?(/lv/jaunumi/[a-z0-9-]+/r)"', home)
    news_cats = list(dict.fromkeys(news_cats))
    for nc in news_cats:
        h = get(nc)
        if not h: continue
        add(nc)
        for p in links(h, re.escape(nc) + r"/\d+-[a-z0-9-]+"):
            if get(p): add(p)

    # Dalībnieki: visas saraksta lapas
    racers = []
    pg = 1
    while True:
        h = get(f"/lv/racers?page={pg}")
        found = links(h, r"/lv/racers/\d+-[a-z0-9-]+")
        if not found: break
        for a in content(h).find_all("a", href=True):
            m = re.fullmatch(r"(?:https?://openkart\.lv)?/lv/racers/(\d+-[a-z0-9-]+)", a["href"])
            if m: racers.append([m.group(1), a.get_text(" ", strip=True)])
        pg += 1
        if pg > 60: break
    add("/lv/racers")
    json.dump(racers, open(os.path.join(CACHE, "_racers.json"), "w"), ensure_ascii=False)

    # Braucēju profili: visi, kas brauca šī gada ieskaitēs
    prof = []
    for p in list(pages):
        if p.startswith(f"/lv/results/{YEAR}/") and p.count("/") == 4:
            for r in links(get(p), r"/lv/racers/\d+-[a-z0-9-]+"):
                if r not in prof: prof.append(r)
    print("profiles:", len(prof), flush=True)
    for i, p in enumerate(prof):
        if get(p): add(p)
        if i % 50 == 0: print(" ", i, flush=True)

    # Otrā kārta: visas šī gada posmu un sacīkšu lapas, uz kurām ved jau savāktās lapas
    extra = []
    for p in list(pages):
        h = get(p)
        if not h: continue
        for q in links(h, rf"/lv/results/{YEAR}/[a-z0-9-]+/\d+|/lv/races/\d+-{YEAR}-[a-z0-9-]+/[a-z_]+"):
            if q not in pages and q not in extra: extra.append(q)
    print("extra:", len(extra), flush=True)
    for q in extra:
        h = get(q)
        if h and content(h) is not None:
            add(q)
            for r in links(h, r"/lv/racers/\d+-[a-z0-9-]+"):
                if r not in pages and get(r): add(r)

    json.dump(pages, open(os.path.join(CACHE, "_pages.json"), "w"), ensure_ascii=False, indent=0)
    print("done", len(pages), "pages", len(racers), "racers")


if __name__ == "__main__":
    main()
