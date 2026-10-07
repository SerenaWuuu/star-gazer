/* Star Gazer: UI wiring. Depends on Astro, StarChart, PhotoMode,
   STAR_CATALOG, CONSTELLATIONS. */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const PRESETS = [
    { name: "Toronto", lat: 43.6532, lon: -79.3832 },
    { name: "New York", lat: 40.7128, lon: -74.006 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Reykjavik", lat: 64.1466, lon: -21.9426 },
  ];

  const WISH_QUIPS = [
    "Make a wish. The universe charges no API fees.",
    "Did you see that? Blink and the cosmos bills you extra.",
    "Wishing on a shooting star: the original serverless function.",
  ];

  const state = { lat: 43.6532, lon: -79.3832, date: new Date(), wished: false };

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }

  /* ---------- hero starfield ---------- */
  function heroStars() {
    const cv = $("heroStars");
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
    }
    size();
    window.addEventListener("resize", size);
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.4 + Math.random() * 1.4,
      p: Math.random() * Math.PI * 2,
      s: 0.5 + Math.random() * 1.5,
    }));
    let raf = null;
    function frame(t) {
      const w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "#dfe7ff";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!document.hidden) raf = requestAnimationFrame(frame);
      else raf = null;
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }

  /* ---------- tabs ---------- */
  function initTabs() {
    const tabs = [$("tabSky"), $("tabPhoto")];
    const panels = [$("panelSky"), $("panelPhoto")];
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t, j) => t.classList.toggle("active", j === i));
        panels.forEach((p, j) => p.classList.toggle("active", j === i));
      });
    });
  }

  /* ---------- location / time controls ---------- */
  function fmtDateTime(d) {
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function saveLoc() {
    try {
      localStorage.setItem("sg-loc", JSON.stringify({ lat: state.lat, lon: state.lon }));
    } catch (e) { /* private mode, no big deal */ }
  }

  function loadLoc() {
    try {
      const raw = localStorage.getItem("sg-loc");
      if (raw) {
        const o = JSON.parse(raw);
        if (isFinite(o.lat) && isFinite(o.lon)) {
          state.lat = o.lat; state.lon = o.lon;
          return;
        }
      }
    } catch (e) { /* ignore */ }
  }

  function syncInputs() {
    $("latIn").value = state.lat.toFixed(4);
    $("lonIn").value = state.lon.toFixed(4);
    $("dtIn").value = fmtDateTime(state.date);
  }

  function initControls() {
    const sel = $("presetSel");
    for (const p of PRESETS) {
      const o = document.createElement("option");
      o.value = p.name;
      o.textContent = p.name;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => {
      const p = PRESETS.find((x) => x.name === sel.value);
      if (p) {
        state.lat = p.lat; state.lon = p.lon;
        saveLoc(); syncInputs(); renderSky();
      }
    });

    $("geoBtn").addEventListener("click", () => {
      const btn = $("geoBtn");
      if (!navigator.geolocation) {
        toast("This browser does not do geolocation. Type your coordinates manually, old school.");
        return;
      }
      btn.disabled = true;
      btn.textContent = "Locating...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.lat = +pos.coords.latitude.toFixed(4);
          state.lon = +pos.coords.longitude.toFixed(4);
          saveLoc(); syncInputs(); renderSky();
          btn.disabled = false;
          btn.textContent = "Use my location";
          toast("Location locked in. The sky above you, coming right up.");
        },
        () => {
          btn.disabled = false;
          btn.textContent = "Use my location";
          toast("Could not get your location, the browser said no. Toronto it is, or type coordinates manually.");
        },
        { timeout: 12000 }
      );
    });

    const manual = () => {
      const la = parseFloat($("latIn").value);
      const lo = parseFloat($("lonIn").value);
      if (!isFinite(la) || la < -90 || la > 90 || !isFinite(lo) || lo < -180 || lo > 180) {
        toast("Those coordinates look off. Latitude -90 to 90, longitude -180 to 180.");
        syncInputs();
        return;
      }
      state.lat = la; state.lon = lo;
      saveLoc(); renderSky();
    };
    $("latIn").addEventListener("change", manual);
    $("lonIn").addEventListener("change", manual);

    $("dtIn").addEventListener("change", () => {
      const v = $("dtIn").value;
      const d = v ? new Date(v) : new Date();
      if (isNaN(d.getTime())) {
        toast("That date did not parse. Time travel remains unavailable.");
        syncInputs();
        return;
      }
      state.date = d;
      renderSky();
    });
    $("nowBtn").addEventListener("click", () => {
      state.date = new Date();
      syncInputs(); renderSky();
    });

    $("wishBtn").addEventListener("click", () => {
      const quip = WISH_QUIPS[Math.floor(Math.random() * WISH_QUIPS.length)];
      StarChart.shoot($("skyCanvas"), () => renderSky());
      toast(quip);
    });
  }

  /* ---------- sky rendering + highlights ---------- */
  function darknessCopy(sunAlt) {
    if (sunAlt > 0) return "Daytime where you are. The stars are up there, just hiding behind the sun.";
    if (sunAlt > -6) return "Twilight. The brightest stars are starting to clock in.";
    if (sunAlt > -12) return "Getting properly dark. Grab a jacket.";
    return "Properly dark. This is the good stuff. Go outside and look up.";
  }

  function renderSky() {
    const canvas = $("skyCanvas");
    const visible = StarChart.computeVisible(state.lat, state.lon, state.date);
    StarChart.draw(canvas, visible, {});

    const sun = Astro.sunAltAz(state.lat, state.lon, state.date);
    $("darkBadge").textContent = darknessCopy(sun.alt);

    // highlights: brightest stars comfortably above the horizon
    const top = visible
      .filter((o) => o.alt > 8)
      .sort((a, b) => a.s.m - b.s.m)
      .slice(0, 6);
    const hl = $("highlights");
    hl.innerHTML = "";
    if (top.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "Nothing bright is up right now. Try a different time, the sky is very punctual.";
      hl.appendChild(li);
    } else {
      for (const o of top) {
        const li = document.createElement("li");
        const dir = Astro.compassPoint(o.az);
        li.innerHTML = "";
        const name = document.createElement("strong");
        name.textContent = StarChart.prettyName(o.s.n);
        const meta = document.createElement("span");
        meta.textContent = "mag " + o.s.m.toFixed(1) + ", " + dir + ", " + Math.round(o.alt) + "° up";
        li.appendChild(name);
        li.appendChild(meta);
        hl.appendChild(li);
      }
    }

    // visible constellations: 3+ member stars above the horizon
    const byIdx = new Set(visible.map((o) => o.i));
    const cons = [];
    for (const c of CONSTELLATIONS) {
      const members = new Set();
      for (const [a, b] of c.lines) { members.add(a); members.add(b); }
      let n = 0;
      for (const m of members) if (byIdx.has(m)) n++;
      if (n >= 3) cons.push(c.name);
    }
    const cl = $("consList");
    cl.innerHTML = "";
    if (cons.length === 0) {
      cl.textContent = "No full constellations above the horizon at this moment.";
      cl.className = "chips empty";
    } else {
      cl.className = "chips";
      for (const name of cons) {
        const s = document.createElement("span");
        s.className = "chip";
        s.textContent = name;
        cl.appendChild(s);
      }
    }

    // one automatic shooting star for delight, once per session
    if (!state.wished) {
      state.wished = true;
      setTimeout(() => {
        if ($("panelSky").classList.contains("active")) {
          StarChart.shoot($("skyCanvas"), () => renderSky());
          setTimeout(() => toast(WISH_QUIPS[0]), 700);
        }
      }, 15000);
    }
  }

  /* ---------- photo mode ---------- */
  function initPhoto() {
    const fileIn = $("fileIn");
    const loading = $("photoLoading");
    const canvas = $("photoCanvas");
    const meta = $("photoMeta");
    const errBox = $("photoError");

    function setState(which) {
      loading.classList.toggle("show", which === "loading");
      canvas.classList.toggle("show", which === "result");
      meta.classList.toggle("show", which === "result");
      errBox.classList.toggle("show", which === "error");
      const hint = $("dropHint");
      if (which === "empty") {
        hint.innerHTML = "<strong>Tap to choose a night sky photo</strong>" +
          "<small>Works best with dark skies and a steady hand.</small>";
      } else if (which !== "loading") {
        hint.innerHTML = "<strong>Tap to try another photo</strong>";
      }
      hint.classList.toggle("show", which !== "loading");
    }

    fileIn.addEventListener("change", async () => {
      const file = fileIn.files[0];
      if (!file) return;
      setState("loading");
      // let the loading state paint before the heavy work
      await new Promise((r) => setTimeout(r, 60));
      try {
        const result = await PhotoMode.analyze(file);
        if (result.spots.length === 0) {
          meta.textContent = "No bright spots found. Either the sky was very dark, the photo was very bright, or the lens cap was on. It happens.";
        } else {
          meta.textContent = "Found " + result.spots.length + " bright spots, numbered by brightness. " +
            "Remember: this is a confident blob finder, not a real plate solver. Cross-check with the Tonight's Sky chart.";
        }
        setState("result");
        // render AFTER the canvas is visible, so clientWidth is real
        PhotoMode.renderResult(canvas, result);
      } catch (e) {
        errBox.textContent = e && e.message === "not-an-image"
          ? "That file does not look like an image. Try a JPG or PNG of the night sky."
          : "Could not read that file. Try another photo.";
        setState("error");
      }
      fileIn.value = "";
    });
  }

  /* ---------- init ---------- */
  function init() {
    loadLoc();
    state.date = new Date();
    initTabs();
    initControls();
    initPhoto();
    syncInputs();
    heroStars();
    renderSky();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
