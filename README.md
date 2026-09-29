# OEP-Check (oep-radar)

Selbsteinschätzungs-Tool für **Open Educational Practices (OEP)** auf Basis des Rasters
„OEP Dimensionen & Kriterien" des OER-Beirats (AG OEP), Stand 25.04.2026.

22 Items in 8 Bausteinen — als Schieberegler bzw. Mehrfachauswahl — werden live in
einem Radar-Diagramm visualisiert. Reines HTML/CSS/JS, kein Backend, kein Tracking.

## Lokal starten

Da `index.html` `data/dimensions.json` per `fetch` lädt, ist ein lokaler Server nötig
(direkter Datei-Doppelklick erlaubt `fetch` aus Sicherheitsgründen nicht).

```bash
# eine der Optionen:
python -m http.server 8000
# oder
npx serve .
```

Dann <http://localhost:8000> öffnen.

## Funktionen

- 18 Slider + 4 Mehrfachauswahl-Items (Beteiligte, Beteiligte Akteure, Lernorte, Nutzung)
- Sub-Auswahl „Veröffentlichungsorte" unter „Weitergabe"
- Radar-Modus: 8 Bausteine (Default) oder 22 Dimensionen (Detail)
- Beispielprofile, Zurücksetzen
- Export: Link (URL-State, kein Server), PNG, JSON

## Quelle / Lizenz

- Inhaltliches Raster: OER-Beirat, AG OEP, Stand 25.04.2026
- Tool-Code: prototypisch, frei nachnutzbar (CC BY 4.0 / MIT)

## Hinweis

„Weniger offen" ist keine Abwertung. Geringe Offenheit kann begründet sein
(Datenschutz, geschützte Zielgruppen). Das Tool dient der Reflexion, nicht der Bewertung.
