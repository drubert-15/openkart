"""Uzbūvē vietni no openkart.lv satura (savākta ar tools/crawl.py).

Lieto: python3 tools/build.py <kešatmiņas mape>

- index.html  — sākumlapa (tools/templates/home.html)
- lapas/*.html — visas pārējās lapas jaunajā dizainā
Saites uz lapām, kas ir uzbūvētas, ved uz vietējām lapām; pārējās — uz openkart.lv.
"""
import os, re, sys, json, html as H
from bs4 import BeautifulSoup, Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1]
BASE = "https://openkart.lv"
OUT = os.path.join(ROOT, "lapas")
T = lambda n: open(os.path.join(ROOT, "tools", "templates", n), encoding="utf-8").read()

pages = json.load(open(os.path.join(CACHE, "_pages.json")))
racers = json.load(open(os.path.join(CACHE, "_racers.json")))


def key(path):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", path.strip("/")) + ".html"


def fname(path):
    """openkart.lv ceļš -> vietējais faila nosaukums lapas/ mapē."""
    return re.sub(r"^lv_", "", key(path))


# Ceļi, kuriem ir vietēja lapa
LOCAL = {p: fname(p) for p in pages}
LOCAL["/lv/results"] = fname("/lv/results/2026/cempionats")
LOCAL["/lv/results/2026"] = LOCAL["/lv/results"]


def norm(href):
    h = href.strip()
    h = re.sub(r"^https?://(www\.)?openkart\.lv", "", h)
    if h.startswith("//"):
        return None
    return h


def rewrite(href, root):
    """Pārraksta saiti: vietējā lapa, ja tāda ir, citādi absolūtā openkart.lv saite."""
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return href
    h = norm(href)
    if h is None or re.match(r"^[a-z]+:", h):
        return href  # ārēja saite
    path, _, frag = h.partition("#")
    path = re.sub(r"[?&]locale=(lv|en)$", "", path)
    if path in ("", "/", "/lv", "/lv/"):
        return root + "index.html" + ("#" + frag if frag else "")
    if path in LOCAL:
        return root + "lapas/" + LOCAL[path] + ("#" + frag if frag else "")
    return BASE + h


def fix_links(html, root):
    def a(m):
        return f'{m.group(1)}="{H.escape(rewrite(H.unescape(m.group(2)), root), quote=True)}"'
    return re.sub(r'\b(href)="([^"]*)"', a, html)


SECTIONS = [
    (r"^/lv/results", "Rezultāti"), (r"^/lv/races", "Kalendārs"), (r"^/lv/racers", "Dalībnieki"),
    (r"^/lv/stats", "Statistika"), (r"^/lv/jaunumi", "Jaunumi"), (r"^/lv/s/", "Openkart"),
]


def section(path):
    for pat, name in SECTIONS:
        if re.match(pat, path):
            return name
    return "Openkart"


def page(title, eyebrow, body, root="../", desc="", extra_js=""):
    top = T("top.html").replace("{{root}}", root)
    foot = T("footer.html").replace("{{root}}", root)
    full_title = "Openkart" if title == "Openkart" else f"{title} — Openkart"
    hero = "" if not eyebrow else f"""
  <section class="page-hero">
    <div class="page-hero__bg" aria-hidden="true"></div>
    <div class="wrap">
      <p class="eyebrow">{H.escape(eyebrow)}</p>
      <h1>{H.escape(title)}</h1>
    </div>
  </section>"""
    main = body if not eyebrow else f'<main class="page">{hero}\n  <div class="wrap content">\n{body}\n  </div>\n</main>'
    doc = f"""<!doctype html>
<html lang="lv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{H.escape(full_title)}</title>
  <meta name="description" content="{H.escape(desc or 'Openkart — amatieru kartinga kustība Latvijā.')}">
  <meta name="theme-color" content="#0b0c0f">
  <link rel="icon" href="{root}assets/img/icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800;900&family=Titillium+Web:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/css/flag-icon.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="{root}assets/css/style.css">
</head>
<body>
{top}
{main}
{foot}
  <script>window.OK_ROOT = "{root}";</script>
  <script src="{root}assets/js/pages.js"></script>
  <script src="{root}assets/js/main.js"></script>{extra_js}
</body>
</html>
"""
    return fix_links(doc, root)


def clean(c):
    """Notīra openkart.lv #content bloku un atgriež (virsraksts, html)."""
    for sel in ["script", "style", "#flash-messages", ".social-share-button", "noscript"]:
        for t in c.select(sel):
            t.decompose()
    for t in c.find_all(string=lambda s: isinstance(s, Comment)):
        t.extract()
    # tukšie float-end konteineri
    for t in c.select(".float-end"):
        if not t.get_text(strip=True) and not t.find("img"):
            t.decompose()
    for t in c.find_all(True):
        t.attrs.pop("style", None)
        for at in ("onclick", "bgcolor", "color", "face", "align", "border", "cellpadding", "cellspacing"):
            t.attrs.pop(at, None)
        if t.name in ("img", "iframe", "source") and t.get("src"):
            s = t["src"]
            if s.startswith("/") and not s.startswith("//"):
                t["src"] = BASE + s
            if t.name == "img":
                t["loading"] = "lazy"
        if t.name == "a" and t.get("href", "").startswith("/uploads/"):
            t["href"] = BASE + t["href"]
        if t.name == "font":
            t.unwrap()
    for sel_el in c.select("[data-active-select]"):
        sel_el["data-active-select"] = sel_el["data-active-select"]
    h1 = c.find("h1")
    title = h1.get_text(" ", strip=True) if h1 else ""
    if h1:
        h1.decompose()
    # tabulas ietinam, lai telefonā var ritināt
    for tb in c.find_all("table"):
        w = c.new_tag("div", attrs={"class": "tablewrap"})
        tb.wrap(w)
    return title, c.decode_contents()


def read(path):
    f = os.path.join(CACHE, key(path))
    return open(f, encoding="utf-8").read() if os.path.exists(f) else None


def racers_page():
    rows = []
    for slug, name in sorted(racers, key=lambda r: r[1].lower()):
        p = "/lv/racers/" + slug
        rows.append(f'<li><a href="{H.escape(p)}"{" class=is-local" if p in LOCAL else ""}>{H.escape(name)}</a></li>')
    body = f"""
    <div class="finder">
      <label class="finder__box">
        <span class="sr">Meklēt braucēju</span>
        <input id="racer-q" type="search" placeholder="Meklē braucēju pēc vārda…" autocomplete="off">
      </label>
      <p class="finder__count"><b id="racer-n">{len(racers)}</b> braucēji kopš 2000. gada</p>
    </div>
    <ul class="racers" id="racer-list">
      {''.join(rows)}
    </ul>
    <p class="note">Iekrāsotie braucēji startējuši 2026. gada sezonā.</p>"""
    return page("Dalībnieki", "Openkart braucēji", body, desc="Visi Openkart braucēji.")


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    built = 0
    for p in pages:
        if p == "/lv/racers":
            html = racers_page()
        elif p == "/lv/results":
            continue
        else:
            raw = read(p)
            if not raw:
                continue
            c = BeautifulSoup(raw, "html.parser").select_one("#content")
            if c is None:
                continue
            title, body = clean(c)
            sec = section(p)
            if p.startswith("/lv/racers/"):
                body = '<p class="back"><a href="/lv/racers">← Visi dalībnieki</a></p>' + re.sub(r'<div class="float-end">\s*<a[^>]*>.*?</a>\s*</div>', "", body, count=1, flags=re.S)
                sec = "Braucēja profils"
            if p.startswith("/lv/jaunumi/"):
                body = f'<div class="article">{body}</div>'
            html = page(title or sec, sec, body)
        open(os.path.join(OUT, LOCAL[p]), "w", encoding="utf-8").write(html)
        built += 1

    # sākumlapa
    home = page("Openkart", "", T("home.html").replace("{{root}}", ""), root="")
    home = home.replace("<title>Openkart</title>", "<title>Openkart — amatieru kartinga sacensības</title>")
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(home)

    # saišu karte JavaScript vajadzībām
    js = "window.OK_PAGES = " + json.dumps(LOCAL, ensure_ascii=False, separators=(",", ":")) + ";\n"
    open(os.path.join(ROOT, "assets", "js", "pages.js"), "w", encoding="utf-8").write(js)
    print("built", built, "pages")


main()
