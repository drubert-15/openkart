/* Lapas, kas aizpildās no datubāzes (data/*.json):
   rezultāti, braucēja profils, kalendārs, dalībnieku saraksts. */
(() => {
  const ROOT = window.OK_ROOT || "";
  const app = document.getElementById("app");
  if (!app) return;
  const kind = app.dataset.page;
  const qs = new URLSearchParams(location.search);
  const L = window.OK_LINK;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cache = {};
  const get = (p) => (cache[p] ||= fetch(`${ROOT}data/${p}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }));
  const setTitle = (t, eyebrow) => {
    const h = document.querySelector(".page-hero h1"); if (h) h.textContent = t;
    if (eyebrow) { const e = document.querySelector(".page-hero .eyebrow"); if (e) e.textContent = eyebrow; }
    document.title = `${t} — Openkart`;
  };
  const flag = (f) => (f ? `<span class="flag-icon flag-icon-${esc(f)}"></span> ` : "");
  const racerLink = (id, name, f) => `<a class="rl" href="${ROOT}lapas/braucejs.html?id=${id}">${flag(f)}${esc(name)}</a>`;
  const fail = (msg) => { app.innerHTML = `<div class="alert alert-danger">${esc(msg)}</div>`; };
  const loading = () => { app.innerHTML = `<div class="loading"><span></span>Ielādē…</div>`; };

  function cellHtml(c) {
    if (Array.isArray(c)) return racerLink(c[1], c[0], c[2]);
    return esc(c);
  }
  function tableHtml(t, cls = "") {
    const right = (h) => /punkt|distance|laiks|starp|atstarp|gokarts|gp punkti/i.test(h);
    const head = t.h.length ? `<thead><tr>${t.h.map((h) => `<th${right(h) ? ' class="r"' : ""}>${esc(h)}</th>`).join("")}</tr></thead>` : "";
    const rows = t.r.map((r) => `<tr>${r.map((c, i) => `<td${t.h[i] && right(t.h[i]) ? ' class="r"' : ""}>${cellHtml(c)}</td>`).join("")}</tr>`).join("");
    return `<div class="tablewrap"><table class="table table-sm table-striped table-results ${cls}">${head}<tbody>${rows}</tbody></table></div>`;
  }
  function select(id, label, options, value, onChange) {
    const html = `<label class="pick"><span>${esc(label)}</span><select class="form-select" id="${id}">${options
      .map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
    setTimeout(() => document.getElementById(id).addEventListener("change", (e) => onChange(e.target.value)));
    return html;
  }

  /* ---------------- Rezultāti ---------------- */
  async function results() {
    loading();
    const idx = await get("index.json");
    const y = idx.seasons[qs.get("y")] ? qs.get("y") : idx.years[0];
    const champs = Object.keys(idx.seasons[y]);
    const c = champs.includes(qs.get("c")) ? qs.get("c") : champs[0];
    const gps = idx.seasons[y][c];
    const g = gps.includes(qs.get("g")) ? qs.get("g") : "";
    const doc = await get(`y/${y}/${c}.json`);
    const go = (ny, nc, ng) => (location.href = L(`/lv/results/${ny}/${nc}${ng ? "/" + ng : ""}`));
    const name = idx.champs[c] || c;
    setTitle(g ? `${g}. posms` : "Kopvērtējums", `Rezultāti · ${y} · ${name}`);

    let body = `<div class="picker card card-header">
      ${select("s-y", "Gads", idx.years.map((v) => [v, v]), y, (v) => go(v, idx.seasons[v][c] ? c : "cempionats", ""))}
      ${select("s-c", "Ieskaite", champs.map((v) => [v, idx.champs[v] || v]), c, (v) => go(y, v, ""))}
      ${select("s-g", "Posms", [["", "Kopvērtējums"], ...gps.map((v) => [v, `${v}. posms`])], g, (v) => go(y, c, v))}
    </div>`;

    if (g) {
      const cal = (doc.cal || []).find((r) => r.gp === g);
      if (cal) body += `<div class="gpinfo"><div><small>Datums</small><b>${esc(cal.d)}</b></div><div><small>Trase</small><b>${esc(cal.tr)}</b></div>${cal.map ? `<a class="btn btn--line" href="${esc(cal.map)}" target="_blank" rel="noopener">Trases shēma</a>` : ""}</div>`;
      body += `<nav class="gpnav">${gps.map((v) => `<a href="${L(`/lv/results/${y}/${c}/${v}`)}"${v === g ? ' class="is-on"' : ""}>${v}</a>`).join("")}</nav>`;
      const tabs = doc.gps[g] || [];
      if (!tabs.length) body += `<p class="note">Šim posmam rezultātu nav.</p>`;
      tabs.forEach((t, i) => (body += `<section class="rblock${i ? " rblock--half" : ""}"><h3>${esc(t.t)}</h3>${tableHtml(t)}</section>`));
      body = body.replace(/(<section class="rblock rblock--half">[\s\S]*)$/, '<div class="rgrid">$1</div>');
    } else {
      const tabs = doc.overall || [];
      body += `<div class="rgrid rgrid--overall">${tabs.map((t) => `<section class="rblock"><h3>${esc(t.t)}</h3>${tableHtml(t)}</section>`).join("")}</div>`;
      if (gps.length) body += `<h3>Posmi</h3><nav class="gpnav">${gps.map((v) => `<a href="${L(`/lv/results/${y}/${c}/${v}`)}">${v}</a>`).join("")}</nav>`;
    }
    app.innerHTML = body;
  }

  /* ---------------- Braucēja profils ---------------- */
  const LABELS = [["races", "Sacīkstes"], ["pts", "Punkti"], ["wins", "Uzvaras"], ["podiums", "Pjedestāli"], ["poles", "Kvalifikācijas uzvaras"], ["front", "Pirmā starta rinda"], ["fast", "Ātrākie apļi"], ["best", "Augstākā vieta"], ["worst", "Zemākā vieta"], ["avg", "Vidējā vieta"]];
  async function racer() {
    loading();
    const id = parseInt(qs.get("id"), 10);
    if (!id) return fail("Braucējs nav norādīts.");
    let r;
    try { r = await get(`r/${id}.json`); } catch (e) { return fail("Šāds braucējs datubāzē nav atrasts."); }
    const idx = await get("index.json");
    setTitle(r.name, "Braucēja profils");
    const champs = Object.keys(r.champs);
    const c0 = r.champs.cempionats;
    let body = `<p class="back"><a href="${L("/lv/racers")}">← Visi dalībnieki</a></p>
      <div class="profile">
        <div class="profile__id">${r.flag ? `<span class="flag-icon flag-icon-${esc(r.flag)} profile__flag"></span>` : ""}
          <div><small>Sezonas datubāzē</small><b>${esc(span(idx.years))}</b></div>
          <div><small>Ieskaites</small><b>${champs.length}</b></div>
        </div>
        ${c0 ? `<div class="tiles">
          <div class="tile"><b>${c0.all.races || 0}</b><span>Sacīkstes</span></div>
          <div class="tile tile--gold"><b>${c0.all.wins || 0}</b><span>Uzvaras</span></div>
          <div class="tile"><b>${c0.all.podiums || 0}</b><span>Pjedestāli</span></div>
          <div class="tile"><b>${c0.all.pts || 0}</b><span>Punkti</span></div>
        </div>` : ""}
      </div>
      <p class="note">Statistika aprēķināta no ${esc(span(idx.years))}. gada sezonu rezultātiem. Pilna vēsture: <a href="https://openkart.lv/lv/racers/${id}" target="_blank" rel="noopener">openkart.lv profils</a>.</p>`;
    if (!champs.length) body += `<p class="note">${esc(span(idx.years))}. gada sezonās šis braucējs nav startējis.</p>`;
    champs.forEach((c) => {
      const ch = r.champs[c];
      const years = Object.keys(ch.years).sort((a, b) => b - a);
      const pid = `ch-${c}`;
      body += `<section class="champ"><h3>${esc(idx.champs[c] || c)}</h3>
        <ul class="nav nav-tabs" data-tabs="${pid}">
          <li class="nav-item"><a class="nav-link active" href="#${pid}-all">Kopsavilkums</a></li>
          ${years.map((y) => `<li class="nav-item"><a class="nav-link" href="#${pid}-${y}">${y}.</a></li>`).join("")}
        </ul>
        <div class="tab-content">
          <div class="tab-pane active" id="${pid}-all">${statGrid(ch.all)}${seasonTable(c, ch)}</div>
          ${years.map((y) => `<div class="tab-pane" id="${pid}-${y}">${statGrid(ch.years[y])}
            <p><a class="btn btn--line" href="${L(`/lv/results/${y}/${c}`)}">${y}. gada kopvērtējums${ch.years[y].pos ? ` · ${ch.years[y].pos}. vieta` : ""}</a></p></div>`).join("")}
        </div></section>`;
    });
    app.innerHTML = body;
    app.querySelectorAll("[data-tabs] .nav-link").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const nav = a.closest(".nav"), pane = document.querySelector(a.getAttribute("href"));
      nav.querySelectorAll(".nav-link").forEach((l) => l.classList.toggle("active", l === a));
      [...pane.parentElement.children].forEach((p) => p.classList.toggle("active", p === pane));
    }));
  }
  function span(years) {
    const ys = [...years].sort();
    return ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : ys[0] || "";
  }
  function statGrid(s) {
    return `<dl class="stats">${LABELS.map(([k, t]) => `<div><dt>${t}</dt><dd>${s[k] ?? (k === "best" || k === "worst" || k === "avg" ? "—" : 0)}</dd></div>`).join("")}</dl>`;
  }
  function seasonTable(c, ch) {
    const years = Object.keys(ch.years).sort((a, b) => b - a);
    const rows = years.map((y) => { const s = ch.years[y]; return `<tr><td><a href="${L(`/lv/results/${y}/${c}`)}">${y}</a></td><td class="r">${s.pos ? s.pos + "." : "—"}</td><td class="r">${s.races || 0}</td><td class="r">${s.pts || 0}</td><td class="r">${s.wins || 0}</td><td class="r">${s.podiums || 0}</td></tr>`; }).join("");
    return `<div class="tablewrap"><table class="table table-sm table-striped"><thead><tr><th>Sezona</th><th class="r">Vieta</th><th class="r">Sacīkstes</th><th class="r">Punkti</th><th class="r">Uzvaras</th><th class="r">Pjedestāli</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ---------------- Kalendārs ---------------- */
  async function calendar() {
    loading();
    const idx = await get("index.json");
    const y = idx.seasons[qs.get("y")] ? qs.get("y") : idx.years[0];
    const cal = await get(`y/${y}/_cal.json`);
    setTitle(`Kalendārs ${y}`, "Kalendārs");
    let body = `<div class="picker card card-header">${select("s-y", "Sezona", idx.years.map((v) => [v, v]), y, (v) => (location.href = L(`/lv/races/year/${v}`)))}</div>`;
    const champs = Object.keys(cal);
    if (!champs.length) body += `<p class="note">Šai sezonai kalendāra nav.</p>`;
    champs.forEach((c) => {
      const rows = cal[c].map((r) => `<tr>
        <td class="gpno">${esc(r.gp)}</td><td class="nw">${esc(r.d)}</td><td>${esc(r.tr)}</td>
        <td>${r.map ? `<a href="${esc(r.map)}" target="_blank" rel="noopener" class="maplink" title="Trases shēma"><i class="fas fa-route"></i></a>` : ""}</td>
        <td>${Array.isArray(r.w) ? racerLink(r.w[1], r.w[0], r.w[2]) : esc(r.w)}</td>
        <td class="r nw">${r.s ? `<a class="btn btn--line btn-sm" href="${L(r.s)}">Pieteikties</a> ` : ""}${(idx.seasons[y][c] || []).includes(r.gp) ? `<a class="btn btn-sm" href="${L(`/lv/results/${y}/${c}/${r.gp}`)}">Rezultāti</a>` : ""}</td></tr>`).join("");
      body += `<section class="rblock"><h3>${esc(idx.champs[c] || c)}</h3><div class="tablewrap"><table class="table table-sm table-striped cal"><thead><tr><th>Gp.</th><th>Datums</th><th>Trase</th><th></th><th>Uzvarētājs</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    });
    app.innerHTML = body;
  }

  /* ---------------- Dalībnieki ---------------- */
  async function racers() {
    loading();
    const list = await get("racers.json");
    const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    app.innerHTML = `<div class="finder">
        <label class="finder__box"><span class="sr">Meklēt braucēju</span>
        <input id="racer-q" type="search" placeholder="Meklē braucēju pēc vārda…" autocomplete="off" value="${esc(qs.get("q") || "")}"></label>
        <p class="finder__count"><b id="racer-n">${list.length}</b> braucēji kopš 2000. gada</p>
      </div>
      <ul class="racers" id="racer-list">${list.map(([id, n, f]) => `<li data-n="${esc(fold(n))}"><a href="${ROOT}lapas/braucejs.html?id=${id}">${flag(f)}${esc(n)}</a></li>`).join("")}</ul>`;
    const q = document.getElementById("racer-q"), items = [...app.querySelectorAll("#racer-list li")];
    const run = () => { const v = fold(q.value.trim()); let n = 0; items.forEach((li) => { const ok = !v || li.dataset.n.includes(v); li.hidden = !ok; n += ok; }); document.getElementById("racer-n").textContent = n; };
    q.addEventListener("input", run); run();
  }

  const fn = { results, racer, calendar, racers }[kind];
  fn && fn().catch((e) => fail("Neizdevās ielādēt datus. " + e.message));
})();
