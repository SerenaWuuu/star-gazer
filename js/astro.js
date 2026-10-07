/* Star Gazer: positional astronomy math. No DOM, no dependencies.
   Approximations are fine for stargazing: J2000 coordinates, no precession,
   no nutation, no refraction correction. */

const Astro = (() => {
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  function julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function gmstHours(jd) {
    const T = (jd - 2451545.0) / 36525;
    let g = 280.46061837
      + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T
      - (T * T * T) / 38710000;
    g = ((g % 360) + 360) % 360;
    return g / 15;
  }

  // raH: right ascension in decimal hours (J2000), decD: declination in degrees.
  // latD/lonD: observer latitude/longitude in degrees (lon east positive).
  // Returns { alt, az } in degrees; az is compass bearing from north, eastward.
  function altAz(raH, decD, latD, lonD, date) {
    const jd = julianDate(date);
    let lst = gmstHours(jd) + lonD / 15;
    lst = ((lst % 24) + 24) % 24;
    let H = lst - raH;
    H = ((H + 36) % 24) - 12; // hour angle in -12..12
    const Hr = H * 15 * D2R;
    const dec = decD * D2R;
    const lat = latD * D2R;
    const sinAlt = Math.sin(dec) * Math.sin(lat)
      + Math.cos(dec) * Math.cos(lat) * Math.cos(Hr);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const azSouth = Math.atan2(
      Math.sin(Hr),
      Math.cos(Hr) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)
    );
    let az = azSouth * R2D + 180;
    az = ((az % 360) + 360) % 360;
    return { alt: alt * R2D, az };
  }

  // Low-precision solar position, good to about a degree. Enough to tell
  // whether it is dark outside.
  function sunAltAz(latD, lonD, date) {
    const n = julianDate(date) - 2451545.0;
    const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
    const gR = g * D2R;
    const lambda = L + 1.915 * Math.sin(gR) + 0.020 * Math.sin(2 * gR);
    const eps = (23.439 - 0.0000004 * n) * D2R;
    const lamR = lambda * D2R;
    let raH = Math.atan2(Math.cos(eps) * Math.sin(lamR), Math.cos(lamR)) * R2D / 15;
    if (raH < 0) raH += 24;
    const decD = Math.asin(Math.sin(eps) * Math.sin(lamR)) * R2D;
    return altAz(raH, decD, latD, lonD, date);
  }

  const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

  function compassPoint(az) {
    return POINTS[Math.round(az / 22.5) % 16];
  }

  return { julianDate, gmstHours, altAz, sunAltAz, compassPoint };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Astro;
}
