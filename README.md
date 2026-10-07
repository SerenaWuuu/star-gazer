# Star Gazer

Your pocket planetarium. A static site, no build step, no backend, no tracking. Open it on your phone, point your eyes at the sky.

**Live:** https://serenawuuu.github.io/star-gazer/

## What it does

**Tonight's Sky**: pick a location (presets including Toronto, one-tap geolocation, or manual coordinates) and a date/time. Renders a canvas star chart of everything above the horizon: 339 of the brightest real stars, simplified constellation lines for 17 constellations, labels for bright stars, a "tonight's highlights" list, and a darkness badge that tells you whether it is even worth going outside.

**Night Photo (experimental)**: upload a photo of the night sky. An adaptive threshold plus non-maximum suppression finds the brightest blobs and numbers them by brightness. This is honestly labeled in the UI: it is a blob finder, not plate solving.

## How it works

- Star positions: bright-star subset (mag ≤ 3.6 plus constellation members, 339 stars) of the **HYG Database v3.8** by David Nash (https://codeberg.org/astronexus/hyg), used under a Creative Commons Attribution-ShareAlike license. Fields kept: name, RA/Dec (J2000), magnitude, B-V color index, Hipparcos ID.
- Math: Julian date → GMST → local sidereal time → hour angle → altitude/azimuth, then a zenith-centered projection. Low-precision solar position for the darkness badge.
- Approximations (stated in the UI): J2000 coordinates with no precession correction, no refraction, no light pollution modeling. Good enough for stargazing, not for spacecraft navigation.
- Everything runs client side. Your photos never leave your device.

## Run it locally

Any static server works:

```bash
cd star-gazer
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to GitHub Pages

1. Push this folder to the `main` branch of `SerenaWuuu/star-gazer`.
2. GitHub → Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)`.
3. Wait a minute, then visit `https://serenawuuu.github.io/star-gazer/`.

## Project layout

```
index.html            page shell, hero, tabs, footer
css/style.css         night-sky theme, mobile first
js/data.js            star catalog (generated, see below)
js/constellations.js  simplified constellation lines (generated)
js/astro.js           Julian date, GMST, alt/az, solar position
js/chart.js           canvas star chart renderer
js/photo.js           night-photo bright-spot detector
js/app.js             UI wiring
```

`js/data.js` and `js/constellations.js` were generated from the HYG v3.8 CSV by filtering to the brightest stars and resolving hand-written constellation line definitions against the catalog. The generation scripts are not committed; the derivation is documented here for provenance.

## License

Code: MIT (see LICENSE). Star catalog data: derived from the HYG Database, CC BY-SA (attribution in-app and above).
