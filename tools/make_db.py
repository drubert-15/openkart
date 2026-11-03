"""Izveido datubāzi (JSON failus mapē data/) no savāktajām openkart.lv lapām.

Lieto: python3 tools/make_db.py <kešatmiņas mape>

data/index.json            gadi, ieskaites, posmu saraksts
data/racers.json           visi braucēji [id, vārds, valsts]
data/y/<gads>/<ieskaite>.json   kopvērtējums + visu posmu rezultāti + kalendārs
data/r/<id>.json           braucēja statistika (aprēķināta no rezultātiem)
"""
import os, re, sys, json, shutil
from collections import defaultdict
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1]
DATA = os.path.join(ROOT, "data")


def key(path):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", path.strip("/")) + ".html"


def load(path):
    f = os.path.join(CACHE, key(path))
    if not os.path.exists(f):
        return None
    c = BeautifulSoup(open(f, encoding="utf-8").read(), "html.parser").select_one("#content")
    return c


RACER_RE = re.compile(r"/lv/racers/(\d+)-([a-z0-9-]+)")
racers = {}  # id -> [name, flag]


def cell(td):
    """Šūna: teksts vai [teksts, braucēja id, valsts]."""
    txt = td.get_text(" ", strip=True)
    a = td.find("a", href=RACER_RE)
    if a:
        m = RACER_RE.search(a["href"])
        rid = int(m.group(1))
        fl = td.find(class_=re.compile(r"flag-icon-"))
        flag = ""
        if fl:
            flag = next((c[10:] for c in fl["class"] if c.startswith("flag-icon-")), "")
        name = a.get_text(" ", strip=True)
        if rid not in racers or (flag and not racers[rid][1]):
            racers[rid] = [name, flag]
        return [txt, rid, flag]
    return txt


def title_of(table):
    for prev in table.find_all_previous(["h3", "h2", "b"], limit=6):
        t = prev.get_text(" ", strip=True)
        if t and t not in ("Gads", "Ieskaite", "Gp."):
            return t
    return ""


def tables(c):
    out = []
    for t in c.find_all("table"):
        rows = t.find_all("tr")
        if not rows:
            continue
        head = []
        if rows[0].find("th") and not rows[0].find("td"):
            head = [x.get_text(" ", strip=True) for x in rows[0].find_all("th")]
            rows = rows[1:]
        body = [[cell(x) for x in r.find_all(["td", "th"])] for r in rows]
        body = [r for r in body if r]
        if body:
            out.append({"t": title_of(t), "h": head, "r": body})
    return out


def opts(c, sel):
    return [(o.get("value", ""), o.get_text(strip=True)) for o in c.select(sel + " option")]


def calendar(year, champ_names):
    c = load(f"/lv/races/year/{year}") or (load("/lv/races") if year == "2026" else None)
    out = {}
    if c is None:
        return out
    name2slug = {v: k for k, v in champ_names.items()}
    for t in c.find_all("table"):
        h = t.find_previous("h3")
        slug = name2slug.get(h.get_text(" ", strip=True)) if h else None
        if not slug:
            continue
        rows = []
        for r in t.find_all("tr")[1:]:
            td = r.find_all("td")
            if len(td) < 5:
                continue
            img = td[3].find("a", href=True)
            sign = r.find("a", href=re.compile("race_signups"))
            rows.append({
                "gp": td[0].get_text(strip=True), "d": td[1].get_text(" ", strip=True),
                "tr": td[2].get_text(" ", strip=True),
                "map": ("https://openkart.lv" + img["href"]) if img and img["href"].startswith("/") else "",
                "w": cell(td[4]),
                "s": re.sub(r"^https?://openkart\.lv", "", sign["href"]) if sign else "",
            })
        out[slug] = rows
    return out


def num(s):
    m = re.match(r"\s*(\d+)", s if isinstance(s, str) else s[0])
    return int(m.group(1)) if m else None


def racer_of(row):
    for x in row:
        if isinstance(x, list):
            return x[1]
    return None


def col(tab, *names):
    for n in names:
        if n in tab["h"]:
            return tab["h"].index(n)
    return None


def year_complete(y, cats):
    """Vai gada visas ieskaites un posmi ir kešatmiņā (lai statistika nebūtu nepilna)."""
    for slug, _ in cats:
        co = load(f"/lv/results/{y}/{slug}")
        if co is None:
            return False
        for g in [v for v, _ in opts(co, "#gp") if v]:
            if not os.path.exists(os.path.join(CACHE, key(f"/lv/results/{y}/{slug}/{g}"))):
                return False
    return True


def main():
    if os.path.exists(DATA):
        shutil.rmtree(DATA)
    os.makedirs(os.path.join(DATA, "r"))
    first = load("/lv/results/2026/cempionats")
    years = [v for v, _ in opts(first, "#year") if v]
    champ_names = {}
    index = {"years": [], "champs": {}, "seasons": {}}
    # statistika: id -> champ -> year -> skaitītāji
    st = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int))))
    places = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    standing = defaultdict(dict)  # (id) -> {(champ,year): pos}

    for y in years:
        c0 = load(f"/lv/results/{y}")
        if c0 is None:
            continue
        cats = opts(c0, "#championship")
        if not year_complete(y, cats):
            print(y, "nav pilnībā lejupielādēts — izlaists", flush=True)
            continue
        for slug, name in cats:
            champ_names.setdefault(slug, name)
        cal = calendar(y, champ_names)
        season = {}
        incomplete = False
        for slug, name in cats:
            co = load(f"/lv/results/{y}/{slug}")
            if co is None:
                continue
            gps = [v for v, _ in opts(co, "#gp") if v]
            doc = {"y": y, "c": slug, "name": name, "overall": tables(co), "gps": {}, "cal": cal.get(slug, [])}
            # kopvērtējuma vietas
            if doc["overall"]:
                for row in doc["overall"][0]["r"]:
                    rid = racer_of(row)
                    if rid:
                        standing[rid][(slug, y)] = num(row[0])
            for g in gps:
                cg = load(f"/lv/results/{y}/{slug}/{g}")
                if cg is None:
                    continue
                tabs = tables(cg)
                doc["gps"][g] = tabs
                for tab in tabs:
                    t = tab["t"].lower()
                    kind = ("race" if t.startswith("sac") else "qual" if t == "kvalifikācija" else
                            "grid" if t.startswith("starta") else "fast" if t.startswith("ātrākie") else None)
                    if kind is None and tab is tabs[0]:
                        kind = "race"
                    if kind is None:
                        continue
                    pc = col(tab, "Punkti")
                    for row in tab["r"]:
                        rid = racer_of(row)
                        pos = num(row[0]) if row else None
                        if not rid:
                            continue
                        s = st[rid][slug][y]
                        if kind == "race":
                            s["races"] += 1
                            if pc is not None and pc < len(row):
                                s["pts"] += num(row[pc]) or 0
                            if pos:
                                s["wins"] += pos == 1
                                s["podiums"] += pos <= 3
                                places[rid][slug][y].append(pos)
                        elif kind == "qual" and pos == 1:
                            s["poles"] += 1
                        elif kind == "grid" and pos and pos <= 2:
                            s["front"] += 1
                        elif kind == "fast" and pos == 1:
                            s["fast"] += 1
            os.makedirs(os.path.join(DATA, "y", y), exist_ok=True)
            json.dump(doc, open(os.path.join(DATA, "y", y, slug + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
            if len(doc["gps"]) < len(gps):
                incomplete = True
            season[slug] = list(doc["gps"])
        if incomplete or len(season) < len(cats):
            # gads nav pilnībā lejupielādēts: neiekļaujam, lai nerādītu nepilnus datus
            shutil.rmtree(os.path.join(DATA, "y", y), ignore_errors=True)
            print(y, "nepilnīgs — izlaists", flush=True)
            continue
        os.makedirs(os.path.join(DATA, "y", y), exist_ok=True)
        json.dump(cal, open(os.path.join(DATA, "y", y, "cal.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        index["years"].append(y)
        index["seasons"][y] = season
        print(y, len(season), "ieskaites", flush=True)
    index["champs"] = champ_names

    # visi braucēji (arī no saraksta lapām)
    rl = os.path.join(CACHE, "_racers.json")
    if os.path.exists(rl):
        for slug, name in json.load(open(rl)):
            rid = int(slug.split("-")[0])
            racers.setdefault(rid, [name, ""])
    json.dump(sorted([[i, n, f] for i, (n, f) in racers.items()], key=lambda r: r[1].lower()),
              open(os.path.join(DATA, "racers.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(index, open(os.path.join(DATA, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))

    # braucēju statistikas faili
    for rid, (name, flag) in racers.items():
        champs = {}
        for slug in index["champs"]:
            if slug not in st[rid]:
                continue
            yrs = {}
            tot = defaultdict(int); allp = []
            for y in sorted(st[rid][slug], reverse=True):
                s = dict(st[rid][slug][y]); p = places[rid][slug][y]
                if p:
                    s.update(best=min(p), worst=max(p), avg=round(sum(p) / len(p), 1))
                s["pos"] = standing[rid].get((slug, y))
                yrs[y] = s
                for k in ("races", "pts", "wins", "podiums", "poles", "front", "fast"):
                    tot[k] += s.get(k, 0)
                allp += p
            if allp:
                tot.update(best=min(allp), worst=max(allp), avg=round(sum(allp) / len(allp), 1))
            champs[slug] = {"all": tot, "years": yrs}
        since = min((y for c in champs.values() for y in c["years"]), default=None)
        json.dump({"id": rid, "name": name, "flag": flag, "since": since, "champs": champs},
                  open(os.path.join(DATA, "r", f"{rid}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print("racers", len(racers))


main()
