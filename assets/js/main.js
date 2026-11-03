(() => {
  const BASE = "https://openkart.lv";
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Dati (no openkart.lv sākumlapas) ---------- */
  const racers = {
    "Andrejs Laipnieks": 596, "Dāvis Zalmans": 1436, "Niks Vucāns": 3015,
    "Ričards Alekss Švaglis": 2550, "Sergejs Ļesiks": 2517, "Ādams Šics": 3477,
    "Armands Mednis": 3571, "Gustavs Narvaišs": 3676, "Benas De La Mare": 3958,
    "Simas Veršickas": 4122, "Ričards Krēmers": 3678, "Liudvikas Kvedaravičius": 4052,
    "Bogdans Ježovs": 4131, "Olivers Tams": 3591, "Nils Kūla": 2807,
    "Raivis Liberts": 2574, "Ainārs Pumpišs": 2577, "Artūrs Tūcis": 4231,
    "Edžus Jasenovičs": 3895, "Otīlija Grandberga": 2899, "Erman Keskin": 3657,
    "Sofija Anna Gisiča": 3815, "Karlīna Gladiševa": 3559, "Elīza Vanaga": 4234,
    "Alise Apsīte": 2997, "Ruslans Dzenis": 2219, "Edgars Lielgalvis": 1653,
  };
  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const ROOT = window.OK_ROOT || "";
  const PAGES = window.OK_PAGES || {};
  // openkart.lv ceļš -> vietējā lapa, ja tāda ir, citādi saite uz openkart.lv
  const href = (path) => (window.OK_LINK ? window.OK_LINK(path) : BASE + path);
  const racerUrl = (n) => href(racers[n] ? `/lv/racers/${racers[n]}-${slug(n)}` : "/lv/racers");

  const standings = [
    { id: "cempionats", name: "Čempionāts", rows: [["Andrejs Laipnieks", 972, 1134], ["Dāvis Zalmans", 787, 856], ["Niks Vucāns", 767, 905], ["Ričards Alekss Švaglis", 754, 852], ["Sergejs Ļesiks", 744, 839]] },
    { id: "komandas", name: "Komandas", link: "/lv/results/2026/cempionats", team: true, rows: [["Movers.lv", 332], ["Rush Racing Team", 252], ["ADTS Racing", 240], ["Movers.lv Juniori", 211], ["Vilniai Racing", 170]] },
    { id: "izaicinajuma-kauss", name: "Izaicinājuma kauss", rows: [["Ādams Šics", 706, 720], ["Armands Mednis", 689, 763], ["Gustavs Narvaišs", 653, 679], ["Benas De La Mare", 642, 699], ["Simas Veršickas", 609]] },
    { id: "debitanti", name: "Debitanti", rows: [["Simas Veršickas", 609], ["Ričards Krēmers", 528, 536], ["Liudvikas Kvedaravičius", 459, 465], ["Bogdans Ježovs", 352, 364], ["Olivers Tams", 293]] },
    { id: "95-plus", name: "95+", rows: [["Nils Kūla", 264, 301], ["Raivis Liberts", 257, 267], ["Ainārs Pumpišs", 221, 244], ["Artūrs Tūcis", 165], ["Edžus Jasenovičs", 151]] },
    { id: "juniori", name: "Juniori", rows: [["Otīlija Grandberga", 234, 245], ["Ādams Šics", 207, 208], ["Armands Mednis", 193, 203], ["Erman Keskin", 183], ["Gustavs Narvaišs", 168, 173]] },
    { id: "damas", name: "Dāmas", rows: [["Otīlija Grandberga", 325, 357], ["Sofija Anna Gisiča", 213], ["Karlīna Gladiševa", 175], ["Elīza Vanaga", 98], ["Alise Apsīte", 76]] },
    { id: "xl-riga-junior-cup", name: "XL Rīga Junior Cup", rows: [["Gustavs Narvaišs", 385, 457], ["Olivers Tams", 372, 463], ["Ādams Šics", 353, 388], ["Karlīna Gladiševa", 305, 334], ["Ričards Krēmers", 297, 353]] },
    { id: "indoor-cup", name: "Indoor Cup", rows: [["Andrejs Laipnieks", 139], ["Ruslans Dzenis", 124], ["Ričards Alekss Švaglis", 114], ["Edgars Lielgalvis", 103], ["Olivers Tams", 88]] },
    { id: "joker-karting-challenge", name: "Joker Karting Challenge", rows: [["Andrejs Laipnieks", 458], ["Ruslans Dzenis", 440, 620], ["Edgars Lielgalvis", 403, 566], ["Ričards Alekss Švaglis", 381, 479], ["Olivers Tams", 338, 428]] },
  ];

  const news = [
    ["15.10", "1718-svetdien-rudenigs-posms-ar-pusfinalu-formatu-serbentu-kartodroma-saulos", "Svētdien rudenīgs posms ar pusfinālu formātu Serbentu kartodromā Šauļos"],
    ["05.10", "1717-grandbergai-kandava-otra-uzvara-karjera-movers-dot-lv-desmito-reizi-cempioni", "Grandbergai Kandavā otrā uzvara karjerā, Movers.lv desmito reizi čempioni"],
    ["02.10", "1716-svetdien-sezonas-nosledzosa-vizite-kandava", "Svētdien sezonas noslēdzošā vizīte Kandavā"],
    ["21.09", "1714-sezonas-pirmaja-pilna-lietus-sacikste-ar-hetriku-uzvar-laipnieks", "Sezonas pirmajā pilnā lietus sacīkstē ar hetriku uzvar Laipnieks"],
    ["21.09", "1715-16-posma-slavas-zale-hall-of-fame-round-16", "16. posma Slavas zāle | Hall of Fame Round 16"],
    ["15.09", "1713-svetdien-16-posms-madonas-kartinga-trase", "Svētdien 16. posms Madonas Kartinga trasē"],
    ["07.09", "1712-laipnieks-uzvar-kandava-un-desmito-reizi-klust-par-openkart-cempionu", "Laipnieks uzvar Kandavā un desmito reizi kļūst par Openkart čempionu"],
    ["04.09", "1710-svetdien-uz-kandavu", "Svētdien uz Kandavu"],
    ["04.09", "1711-14-posma-slavas-zale-hall-of-fame-of-round-14", "14. posma Slavas Zāle | Hall of Fame of Round 14"],
    ["31.08", "1709-salvets-klust-par-pirmo-igauni-openkart-cempionata-posma-uzvaretaju", "Salvets kļūst par pirmo igauni Openkart čempionāta posma uzvarētāju"],
  ];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Piekļuves logs ---------- */
  const gate = $("#gate");
  const isHome = !!$("#countdown");
  let accepted = false;
  try { accepted = localStorage.getItem("ok-gate") === "1"; } catch (e) {}
  if (!accepted) gate.hidden = false;
  $("#gate-ok").addEventListener("click", () => {
    gate.hidden = true;
    try { localStorage.setItem("ok-gate", "1"); } catch (e) {}
    if (isHome) startLights();
  });

  /* ---------- Datums ---------- */
  const today = new Date();
  const dStr = today.toLocaleDateString("lv-LV", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
  $("#today").textContent = dStr.charAt(0).toUpperCase() + dStr.slice(1);

  /* ---------- Galvene un izvēlne ---------- */
  const header = $("#header"), nav = $("#nav"), burger = $("#burger");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const setMenu = (open) => {
    nav.style.top = open ? header.getBoundingClientRect().bottom + "px" : "";
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.querySelectorAll(".dd__btn").forEach((b) => b.addEventListener("click", () => {
    const dd = b.parentElement, open = !dd.classList.contains("is-open");
    dd.classList.toggle("is-open", open);
    b.setAttribute("aria-expanded", open);
  }));
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".dd.is-open").forEach((dd) => { if (!dd.contains(e.target) && window.innerWidth > 980) dd.classList.remove("is-open"); });
  });

  initCommon();
  if (!isHome) return;

  /* ---------- Taimeris līdz startam (08.11.2026 12:00 Lietuvas laiks) ---------- */
  const target = new Date("2026-11-08T12:00:00+02:00").getTime();
  const cd = {};
  document.querySelectorAll("#countdown [data-k]").forEach((el) => (cd[el.dataset.k] = el));
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    let t = Math.max(0, Math.floor((target - Date.now()) / 1000));
    cd.d.textContent = pad(Math.floor(t / 86400)); t %= 86400;
    cd.h.textContent = pad(Math.floor(t / 3600)); t %= 3600;
    cd.m.textContent = pad(Math.floor(t / 60));
    cd.s.textContent = pad(t % 60);
  };
  tick(); setInterval(tick, 1000);

  /* ---------- Starta gaismas ---------- */
  const lights = $("#lights");
  var lightsTimer;
  function startLights() {
    clearTimeout(lightsTimer);
    const bulbs = [...lights.children];
    lights.classList.remove("go");
    bulbs.forEach((b) => b.classList.remove("on"));
    let i = 0;
    const step = () => {
      if (i < bulbs.length) { bulbs[i++].classList.add("on"); lightsTimer = setTimeout(step, 700); }
      else lightsTimer = setTimeout(() => {
        bulbs.forEach((b) => b.classList.remove("on"));
        lights.classList.add("go");
        lightsTimer = setTimeout(startLights, 3500);
      }, 900 + Math.random() * 1200);
    };
    lightsTimer = setTimeout(step, 600);
  }
  if (accepted) startLights();

  /* ---------- Ticker ---------- */
  const champ = standings[0].rows.map((r, i) => `<span><em>P${i + 1}</em>${esc(r[0])}<b>${r[1]}</b></span>`).join("");
  const teams = standings[1].rows.slice(0, 3).map((r, i) => `<span><em>Komanda P${i + 1}</em>${esc(r[0])}<b>${r[1]}</b></span>`).join("");
  $("#ticker").innerHTML = (champ + teams).repeat(2);

  /* ---------- Jaunumu saraksts ---------- */
  $("#news-list").innerHTML = news.map(([d, s, t]) =>
    `<li><a href="${href("/lv/jaunumi/cempionats/r/" + s)}"><time>${d}</time><span>${esc(t)}</span></a></li>`).join("");

  /* ---------- Kopvērtējums ---------- */
  const tabs = $("#tabs"), podium = $("#podium"), rows = $("#rows"), link = $("#standings-link");
  tabs.innerHTML = standings.map((s, i) =>
    `<button role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(s.name)}</button>`).join("");

  const nameLink = (cat, n, cls) => cat.team
    ? `<span class="${cls}">${esc(n)}</span>`
    : `<a class="${cls}" href="${racerUrl(n)}">${esc(n)}</a>`;
  const pts = (r) => `${r[1]}${r[2] ? `<small>(${r[2]})</small>` : ""}`;

  function render(i) {
    const cat = standings[i];
    tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.i == i));
    link.href = href(cat.link || `/lv/results/2026/${cat.id}`);
    const order = [1, 0, 2];
    podium.innerHTML = order.map((k) => {
      const r = cat.rows[k];
      return `<div class="step step--${k + 1}">
        <div class="step__who">${nameLink(cat, r[0], "step__name")}<div class="step__pts">${pts(r)}</div></div>
        <div class="step__block">${k + 1}</div>
      </div>`;
    }).join("");
    const max = cat.rows[0][1];
    rows.innerHTML = cat.rows.map((r, k) => `<li class="row${k < 3 ? " row--top" : ""}" style="animation-delay:${k * 50}ms">
        <span class="row__pos">${k + 1}.</span>
        ${nameLink(cat, r[0], "row__name")}
        <span class="row__pts">${pts(r)}</span>
        <span class="row__bar" style="width:${(r[1] / max) * 100}%"></span>
      </li>`).join("");
  }
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) render(+b.dataset.i);
  });
  render(0);

  /* ---------- Kopīgais visām apakšlapām ---------- */
  function initCommon() {
    // Bootstrap stila cilnes (braucēju profili, statistika u.c.)
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const id = a.getAttribute("href");
        const pane = id && document.querySelector(id);
        if (!pane) return;
        const nav = a.closest(".nav");
        nav && nav.querySelectorAll(".nav-link").forEach((l) => l.classList.toggle("active", l === a));
        [...pane.parentElement.children].forEach((p) => p.classList.toggle("active", p === pane));
      });
    });

    // Rezultātu izvēlnes (gads / ieskaite / posms)
    document.querySelectorAll("select[data-active-select]").forEach((sel) => {
      sel.addEventListener("change", () => {
        if (!sel.value) return;
        const url = sel.dataset.activeSelect.replace("__template__", sel.value);
        location.href = href(url.replace(/^https?:\/\/openkart\.lv/, ""));
      });
    });

    // Modālie logi
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach((b) => {
      b.addEventListener("click", (e) => {
        const m = document.querySelector(b.dataset.bsTarget || b.getAttribute("href"));
        if (m) { e.preventDefault(); m.classList.add("show"); }
      });
    });
    document.querySelectorAll(".modal").forEach((m) => {
      m.addEventListener("click", (e) => {
        if (e.target === m || e.target.closest('[data-bs-dismiss="modal"]')) m.classList.remove("show");
      });
    });

    // Braucēju meklēšana
    const q = $("#racer-q");
    if (q) {
      const items = [...document.querySelectorAll("#racer-list li")];
      const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      items.forEach((li) => (li.dataset.n = fold(li.textContent)));
      q.addEventListener("input", () => {
        const v = fold(q.value.trim());
        let n = 0;
        items.forEach((li) => { const ok = !v || li.dataset.n.includes(v); li.hidden = !ok; if (ok) n++; });
        $("#racer-n").textContent = n;
      });
    }
  }
})();
