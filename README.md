# openkart

Jauns dizains [openkart.lv](https://openkart.lv) vietnei: autosporta / kartinga tēma.
Vietne darbojas kā statiska lapa (piem., GitHub Pages).

## Struktūra

- `index.html`: sākumlapa
- `lapas/rezultati.html`, `braucejs.html`, `kalendars.html`, `dalibnieki.html`: **veidnes**, kas aizpildās no datubāzes
- `lapas/*.html`: pārējās lapas (jaunumi, raksti, nolikums, slavas zāle, statistika, kontakti u.c.)
- `data/`: **datubāze** (JSON)
  - `index.json`: gadi, ieskaites, posmi
  - `racers.json`: visi braucēji
  - `y/<gads>/<ieskaite>.json`: kopvērtējums un visu posmu rezultāti
  - `y/<gads>/_cal.json`: kalendārs
  - `r/<id>.json`: braucēja statistika (aprēķināta no rezultātiem)
- `assets/`: dizains (CSS), JavaScript, attēli

Saites uz lapām, kuru datu šeit nav (piem., vecāki gadi, pieteikšanās, autorizācija), ved uz openkart.lv.

## Datu atjaunošana

```sh
python3 tools/crawl.py CACHE           # jaunumi, informācijas lapas, braucēju saraksts
python3 tools/crawl_results.py CACHE   # visu gadu rezultāti un kalendāri
python3 tools/make_db.py CACHE         # izveido data/ datubāzi
python3 tools/build.py CACHE           # uzbūvē index.html un lapas/
```

`CACHE` ir mape, kurā glabājas lejupielādētās lapas. Datubāzē tiek iekļauti tikai pilnībā lejupielādētie gadi (šobrīd 2025 un 2026).
