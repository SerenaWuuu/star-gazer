# Star Gazer: testing notes

## What was verified (Oct 6, 2026, by the builder)

- **JS syntax**: `node --check` passes on all six JS files
  (`data.js`, `constellations.js`, `astro.js`, `chart.js`, `photo.js`, `app.js`).
- **Catalog provenance**: `js/data.js` (339 stars) was generated from the real
  HYG Database v3.8 CSV (downloaded from the archived
  `astronexus/HYG-Database` GitHub repo, `hyg/v3/hyg_v38.csv.gz`;
  current edition lives at https://codeberg.org/astronexus/hyg).
  Filter: mag ≤ 3.6 plus every star referenced by a constellation line.
  Spot checks: Sirius RA 6.7525h / Dec -16.7161 / mag -1.44,
  Vega 18.6156h / +38.7837, Polaris 2.5298h / +89.2641. All match the catalog.
- **Constellation lines**: all 17 constellations, 85 line segments, every
  endpoint resolved against the actual catalog by proper name, Bayer
  designation (including superscript forms like `Del-2 Lyr`), or Flamsteed
  number. Zero unresolved aliases, zero out-of-range indices (asserted by test).
- **Astronomy math** (`/tmp/test_sg.js`, node):
  - 144 of 339 stars above the horizon for Toronto at test time.
  - Polaris altitude 43.79°, within 1.5° of the observer latitude (43.65°),
    as spherical astronomy requires.
  - All alt/az outputs within valid ranges; compass points N/E/S/W correct.
  - Sun altitude sane (-29.6° at ~9:30pm EDT in October, properly dark).
- **DOM wiring**: all 23 element IDs referenced in `app.js` exist in
  `index.html` (scripted cross-check).
- **Copy checks**: no em-dashes anywhere; every GitHub link uses
  `SerenaWuuu` (three u's); photo mode is explicitly labeled experimental
  in the UI; approximations are disclosed under the chart.
- **Dependencies**: zero. No CDN, no fonts, no libraries. Works offline
  once loaded; nothing to curl.

## What still needs on-device testing

- **iPhone Safari (primary target)**: open the Pages URL, confirm the chart
  renders, geolocation prompt flow, tab switching, and the shooting-star
  easter egg (tap the sparkle button, and wait ~15s on first load).
- **Night Photo mode**: upload a real night-sky photo; tune the detection
  threshold if bright skies under/over-detect. Desktop test with any JPG
  works too (file input, no camera needed).
- **datetime-local picker** on iOS Safari: confirm it opens and re-renders.
- **GitHub Pages deploy**: push `main`, enable Pages from branch, visit
  https://serenawuuu.github.io/star-gazer/ and hard-refresh once.

## Known honest limitations (also stated in the UI)

- J2000 coordinates, no precession/nutation/refraction correction.
- Photo mode is a bright-spot detector, not plate solving.
- Constellation figures are simplified guides, not IAU boundaries.
